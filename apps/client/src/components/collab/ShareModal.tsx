import { useEffect, useState } from 'react';
import { useCollabStore, type ProjectInvite } from '../../store/useCollabStore';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import toast from 'react-hot-toast';

interface ShareModalProps {
  projectId: string;
  onClose: () => void;
}

type RoleOption = 'editor' | 'viewer';
type ExpiryOption = 0 | 7 | 30;

export function ShareModal({ projectId, onClose }: ShareModalProps) {
  const { invites, fetchInvites, createInvite, revokeInvite } = useCollabStore();
  const { currentUserRole } = useApiSpecStore();
  const canCreateInvite = currentUserRole === 'owner' || currentUserRole === 'editor';
  const [role, setRole] = useState<RoleOption>('editor');
  const [expiry, setExpiry] = useState<ExpiryOption>(7);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites(projectId);
  }, [projectId]);

  const inviteBaseUrl = `${window.location.origin}${window.location.pathname}?invite=`;

  const handleCreate = async () => {
    if (!canCreateInvite) {
      toast.error('Only owners and editors can generate invite links.');
      return;
    }
    setCreating(true);
    const invite = await createInvite(projectId, role, expiry === 0 ? undefined : expiry);
    setCreating(false);
    if (!invite) toast.error('Failed to create invite link. Check the browser console for details.');
  };

  const handleCopy = (invite: ProjectInvite) => {
    navigator.clipboard.writeText(`${inviteBaseUrl}${invite.token}`);
    setCopiedId(invite.id);
    toast.success('Link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id: string) => {
    await revokeInvite(id);
    toast.success('Invite revoked');
  };

  const formatExpiry = (inv: ProjectInvite) => {
    if (!inv.expiresAt) return 'Never expires';
    const d = new Date(inv.expiresAt);
    return d < new Date() ? '⚠ Expired' : `Expires ${d.toLocaleDateString()}`;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card-elevated" style={{ width: 520, padding: 28, animation: 'fadeIn 0.2s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              🔗 Share Project
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Anyone with the link can join as collaborator
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Create new invite — only for owner / editor */}
        {canCreateInvite ? (
          <div className="card" style={{ marginBottom: 20, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Generate Invite Link
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="label">Role</label>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as RoleOption)}>
                  <option value="editor">Editor — can view &amp; save</option>
                  <option value="viewer">Viewer — read-only</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Expiry</label>
                <select className="input" value={expiry} onChange={(e) => setExpiry(Number(e.target.value) as ExpiryOption)}>
                  <option value={0}>Never</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={creating} style={{ width: '100%', justifyContent: 'center' }}>
              {creating ? 'Generating…' : '+ Generate Link'}
            </button>
          </div>
        ) : (
          <div style={{
            marginBottom: 20, padding: '12px 16px',
            background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8,
            fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
          }}>
            👁 Viewers cannot generate invite links. Ask the project owner.
          </div>
        )}

        {/* Active invite links */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Active Links ({invites.length})
        </div>

        {invites.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>
            No invite links yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
            {invites.map((inv) => (
              <div key={inv.id} style={{
                background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {/* Role badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: inv.role === 'editor' ? 'rgba(137,180,250,0.15)' : 'rgba(166,227,161,0.15)',
                  color: inv.role === 'editor' ? 'var(--accent-blue)' : 'var(--accent-green)',
                  border: `1px solid ${inv.role === 'editor' ? 'rgba(137,180,250,0.3)' : 'rgba(166,227,161,0.3)'}`,
                  textTransform: 'uppercase', flexShrink: 0,
                }}>
                  {inv.role}
                </span>

                {/* Link snippet */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    …{inv.token.slice(-16)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatExpiry(inv)} · Used {inv.useCount}×
                  </div>
                </div>

                {/* Actions */}
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => handleCopy(inv)}
                  data-tooltip="Copy link"
                  style={{ color: copiedId === inv.id ? 'var(--accent-green)' : undefined }}
                >
                  {copiedId === inv.id ? '✓' : '⎘'}
                </button>
                <button
                  className="btn btn-danger btn-sm btn-icon"
                  onClick={() => handleRevoke(inv.id)}
                  data-tooltip="Revoke"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
