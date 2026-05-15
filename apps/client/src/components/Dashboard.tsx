import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useApiSpecStore } from '../store/useApiSpecStore';
import { useCollabStore } from '../store/useCollabStore';
import { MembersPanel } from './collab/MembersPanel';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  updated_at: string;
  isShared?: boolean;
  myRole?: string;
}

export function Dashboard({ onProjectSelect }: { onProjectSelect: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersProjectId, setMembersProjectId] = useState<string | null>(null);
  const { loadProjectFromSupabase, createNewProject, deleteProject, renameProject } = useApiSpecStore();
  const { fetchMembers } = useCollabStore();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const userId = userData.user.id;

      const { data: rpcData, error: rpcErr } = await supabase
        .rpc('get_my_accessible_projects');

      if (rpcErr) {
        console.error('[fetchProjects] RPC error:', rpcErr.message, rpcErr.details ?? '', rpcErr.hint ?? '');

        if (rpcErr.message?.includes('function') || rpcErr.code === '42883') {
          console.warn('[fetchProjects] RPC not found — falling back to own-projects-only query.');
          const { data: ownOnly, error: fallbackErr } = await supabase
            .from('projects')
            .select('id, name, updated_at, user_id')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

          if (fallbackErr) {
            toast.error(`Failed to load projects: ${fallbackErr.message}`);
            return;
          }
          setProjects((ownOnly ?? []).map((p: any) => ({ ...p, isShared: false, myRole: 'owner' })));
          return;
        }

        toast.error(`Failed to load projects: ${rpcErr.message}`);
        return;
      }

      const merged: Project[] = (rpcData ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        updated_at: p.updated_at,
        isShared: p.user_id !== userId,
        myRole: p.my_role,
      }));

      const seen = new Set<string>();
      setProjects(merged.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; }));
    } catch (err: any) {
      console.error('[fetchProjects] unexpected error:', err);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async () => {
    const name = window.prompt('Enter project name:', 'New API Project');
    if (!name) return;
    const ok = await createNewProject(name);
    if (ok) onProjectSelect();
  };

  const handleSelect = async (p: Project) => {
    await loadProjectFromSupabase(p.id, (p.myRole ?? 'viewer') as 'owner' | 'editor' | 'viewer');
    onProjectSelect();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleMembers = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    fetchMembers(projectId);
    setMembersProjectId(projectId);
  };

  const handleDelete = async (e: React.MouseEvent, p: Project) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${p.name}"? This action cannot be undone and will remove all collaborators and invite links.`)) return;
    const ok = await deleteProject(p.id);
    if (ok) {
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      toast.success('Project deleted');
    }
  };

  const handleRename = async (p: Project, newName: string) => {
    if (newName.trim() === p.name || !newName.trim()) return;
    const ok = await renameProject(p.id, newName);
    if (ok) {
      setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, name: newName.trim() } : x));
      toast.success('Project renamed');
    }
  };

  const roleColor = (role?: string) => {
    if (role === 'owner') return 'var(--accent-purple)';
    if (role === 'editor') return 'var(--accent-blue)';
    return 'var(--accent-green)';
  };

  const roleLabel = (role?: string) => {
    if (role === 'owner') return '👑 Owner';
    if (role === 'editor') return '✏️ Editor';
    return '👁 Viewer';
  };

  const ownProjects = projects.filter((p) => !p.isShared);
  const sharedProjects = projects.filter((p) => p.isShared);

  return (
    <div style={{ padding: 40, maxWidth: 860, margin: '0 auto', animation: 'fadeIn 0.25s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: '0 0 16px rgba(137,180,250,0.3)',
            }}>⚡</div>
            <h1 style={{ fontSize: 24, margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>API Studio</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Your API projects</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
          <button className="btn btn-primary" onClick={handleCreate}>+ New Project</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 56 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8 }}>No projects yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Create your first API or accept an invite link</div>
          <button className="btn btn-primary" onClick={handleCreate}>Create your first API</button>
        </div>
      ) : (
        <>
          {/* Own projects */}
          {ownProjects.length > 0 && (
            <Section title="My Projects" count={ownProjects.length}>
              {ownProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  roleLabel={roleLabel(p.myRole)}
                  roleColor={roleColor(p.myRole)}
                  onSelect={() => handleSelect(p)}
                  onMembers={(e) => handleMembers(e, p.id)}
                  onDelete={(e) => handleDelete(e, p)}
                  onRename={(newName) => handleRename(p, newName)}
                  showMembersBtn
                />
              ))}
            </Section>
          )}

          {/* Shared with me */}
          {sharedProjects.length > 0 && (
            <Section title="Shared with me" count={sharedProjects.length}>
              {sharedProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  roleLabel={roleLabel(p.myRole)}
                  roleColor={roleColor(p.myRole)}
                  onSelect={() => handleSelect(p)}
                  onMembers={(e) => handleMembers(e, p.id)}
                  showMembersBtn={false}
                />
              ))}
            </Section>
          )}
        </>
      )}

      {/* Members modal */}
      {membersProjectId && (
        <MembersPanel
          projectId={membersProjectId}
          isOwner={projects.find((p) => p.id === membersProjectId)?.myRole === 'owner'}
          onClose={() => setMembersProjectId(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
          background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)',
        }}>{count}</span>
      </div>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {children}
      </div>
    </div>
  );
}

function ProjectCard({ project, roleLabel, roleColor, onSelect, onMembers, onDelete, onRename, showMembersBtn }: {
  project: Project;
  roleLabel: string;
  roleColor: string;
  onSelect: () => void;
  onMembers: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onRename?: (newName: string) => void;
  showMembersBtn: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when project name changes externally
  useEffect(() => { setDraft(project.name); }, [project.name]);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(project.name);
    setEditing(true);
    // Focus happens after re-render
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== project.name) {
      onRename?.(draft.trim());
    } else {
      setDraft(project.name); // reset if blank or unchanged
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(project.name);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  };

  const hasFooter = showMembersBtn || !!onDelete;

  return (
    <div
      className="card"
      onClick={editing ? undefined : onSelect}
      style={{ cursor: editing ? 'default' : 'pointer', padding: 18, transition: 'var(--transition)', position: 'relative' }}
      onMouseEnter={(e) => { if (!editing) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-blue)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
    >
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        {editing ? (
          /* ── Inline edit mode ── */
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={onKeyDown}
              style={{
                flex: 1, fontSize: 15, fontWeight: 600,
                background: 'var(--bg-overlay)', border: '1px solid var(--accent-blue)',
                borderRadius: 6, padding: '3px 8px', color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onMouseDown={(e) => { e.preventDefault(); commitEdit(); }}
              style={{ color: 'var(--accent-green)', fontSize: 13 }}
              title="Save (Enter)"
            >✓</button>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
              style={{ fontSize: 11 }}
              title="Cancel (Esc)"
            >✕</button>
          </div>
        ) : (
          /* ── Display mode ── */
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.name}
            </h3>
            {onRename && (
              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={startEdit}
                title="Rename project"
                style={{ opacity: 0.4, fontSize: 11, flexShrink: 0, transition: 'opacity 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.4')}
              >
                ✎
              </button>
            )}
          </div>
        )}

        <span style={{ fontSize: 10, fontWeight: 600, color: roleColor, flexShrink: 0 }}>
          {roleLabel}
        </span>
      </div>

      {/* Updated date */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: hasFooter ? 14 : 0 }}>
        Updated {new Date(project.updated_at).toLocaleDateString()}
      </div>

      {/* Footer actions */}
      {hasFooter && (
        <div style={{ display: 'flex', gap: 6 }}>
          {showMembersBtn && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); onMembers(e); }}
              style={{ fontSize: 11 }}
            >
              👥 Members
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-danger btn-sm"
              onClick={onDelete}
              style={{ fontSize: 11, marginLeft: 'auto' }}
              data-tooltip="Delete project"
            >
              🗑 Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}


