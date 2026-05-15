import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  userId: string;
  email: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  onlineAt: string;
}

export interface CollabMember {
  id: string;
  userId: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export interface ProjectInvite {
  id: string;
  token: string;
  role: 'editor' | 'viewer';
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
}

// Deterministic avatar color from user id
const PRESENCE_COLORS = [
  '#89b4fa', '#cba6f7', '#94e2d5', '#a6e3a1',
  '#f9e2af', '#fab387', '#f5c2e7', '#f38ba8',
];
export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

interface CollabStore {
  // Presence
  onlineUsers: PresenceUser[];
  // Members
  members: CollabMember[];
  // Invites
  invites: ProjectInvite[];
  // Sync
  hasRemoteChange: boolean;
  lastSyncedAt: Date | null;
  remoteChangedBy: string | null;
  // Channel ref
  _channel: RealtimeChannel | null;

  // Actions
  subscribeToProject: (projectId: string, currentUser: { id: string; email: string }, role: 'owner' | 'editor' | 'viewer') => void;
  unsubscribeFromProject: () => void;
  fetchMembers: (projectId: string) => Promise<void>;
  fetchInvites: (projectId: string) => Promise<void>;
  createInvite: (projectId: string, role: 'editor' | 'viewer', expiresInDays?: number) => Promise<ProjectInvite | null>;
  revokeInvite: (inviteId: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: 'editor' | 'viewer') => Promise<void>;
  acceptInvite: (token: string) => Promise<{ projectId: string; role: string } | null>;
  broadcastSave: (savedByEmail: string) => void;
  clearRemoteChange: () => void;
}

export const useCollabStore = create<CollabStore>((set, get) => ({
  onlineUsers: [],
  members: [],
  invites: [],
  hasRemoteChange: false,
  lastSyncedAt: null,
  remoteChangedBy: null,
  _channel: null,

  subscribeToProject: (projectId, currentUser, role) => {
    // Unsubscribe from any existing channel first
    get().unsubscribeFromProject();

    const channel = supabase.channel(`project:${projectId}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Omit<PresenceUser, 'userId'>>();
        const users: PresenceUser[] = Object.entries(state).map(([userId, presences]) => ({
          userId,
          ...(presences[0] as Omit<PresenceUser, 'userId'>),
        }));
        set({ onlineUsers: users });
      })
      .on('broadcast', { event: 'spec_saved' }, ({ payload }) => {
        set({
          hasRemoteChange: true,
          remoteChangedBy: payload.savedByEmail ?? 'A collaborator',
          lastSyncedAt: new Date(),
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            email: currentUser.email,
            color: colorForUser(currentUser.id),
            role,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    set({ _channel: channel });
  },

  unsubscribeFromProject: () => {
    const { _channel } = get();
    if (_channel) {
      supabase.removeChannel(_channel);
      set({ _channel: null, onlineUsers: [], hasRemoteChange: false, remoteChangedBy: null });
    }
  },

  fetchMembers: async (projectId) => {
    // Use SECURITY DEFINER RPC to join project_members with auth.users,
    // which returns real email addresses (auth.users is not accessible via RLS).
    const { data, error } = await supabase
      .rpc('get_project_members_with_emails', { p_project_id: projectId });

    if (error) {
      console.error('[fetchMembers] RPC error:', error.message);
      return;
    }
    if (!data) return;

    set({
      members: data.map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        email: m.email,
        role: m.role as CollabMember['role'],
        joinedAt: m.joined_at,
      })),
    });
  },

  fetchInvites: async (projectId) => {
    const { data, error } = await supabase
      .from('project_invites')
      .select('id, token, role, expires_at, max_uses, use_count, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error || !data) return;

    set({
      invites: data.map((inv) => ({
        id: inv.id,
        token: inv.token,
        role: inv.role as 'editor' | 'viewer',
        expiresAt: inv.expires_at,
        maxUses: inv.max_uses,
        useCount: inv.use_count,
        createdAt: inv.created_at,
      })),
    });
  },

  createInvite: async (projectId, role, expiresInDays) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    // Generate a cryptographically secure token client-side.
    // This avoids the pgcrypto extension requirement for gen_random_bytes() on Supabase.
    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400_000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('project_invites')
      .insert({ project_id: projectId, token, role, created_by: userData.user.id, expires_at: expiresAt })
      .select('id, token, role, expires_at, max_uses, use_count, created_at')
      .single();

    if (error) {
      console.error('[createInvite] Supabase error:', error.message, error.details ?? '', error.hint ?? '');
      return null;
    }
    if (!data) return null;

    const invite: ProjectInvite = {
      id: data.id,
      token: data.token,
      role: data.role as 'editor' | 'viewer',
      expiresAt: data.expires_at,
      maxUses: data.max_uses,
      useCount: data.use_count,
      createdAt: data.created_at,
    };

    set((s) => ({ invites: [invite, ...s.invites] }));
    return invite;
  },

  revokeInvite: async (inviteId) => {
    await supabase.from('project_invites').delete().eq('id', inviteId);
    set((s) => ({ invites: s.invites.filter((i) => i.id !== inviteId) }));
  },

  removeMember: async (memberId) => {
    await supabase.from('project_members').delete().eq('id', memberId);
    set((s) => ({ members: s.members.filter((m) => m.id !== memberId) }));
  },

  updateMemberRole: async (memberId, role) => {
    await supabase.from('project_members').update({ role }).eq('id', memberId);
    set((s) => ({
      members: s.members.map((m) => (m.id === memberId ? { ...m, role } : m)),
    }));
  },

  acceptInvite: async (token) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    // 1. Fetch invite
    const { data: invite, error: inviteErr } = await supabase
      .from('project_invites')
      .select('id, project_id, role, expires_at, max_uses, use_count')
      .eq('token', token)
      .single();

    if (inviteErr || !invite) return null;

    // 2. Validate expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null;

    // 3. Validate max uses
    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) return null;

    // 4. Check if already a member
    const { data: existing } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', invite.project_id)
      .eq('user_id', userData.user.id)
      .single();

    if (!existing) {
      // 5. Add member
      await supabase.from('project_members').insert({
        project_id: invite.project_id,
        user_id: userData.user.id,
        role: invite.role,
      });
    }

    // 6. Increment use_count
    await supabase
      .from('project_invites')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    return { projectId: invite.project_id, role: invite.role };
  },

  broadcastSave: (savedByEmail) => {
    const { _channel } = get();
    if (!_channel) return;
    _channel.send({ type: 'broadcast', event: 'spec_saved', payload: { savedByEmail } });
  },

  clearRemoteChange: () => set({ hasRemoteChange: false, remoteChangedBy: null }),
}));
