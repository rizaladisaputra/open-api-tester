import { useEffect } from 'react';
import { useCollabStore, colorForUser } from '../../store/useCollabStore';
import toast from 'react-hot-toast';

interface MembersPanelProps {
  projectId: string;
  isOwner: boolean;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner: '👑 Owner',
  editor: '✏️ Editor',
  viewer: '👁 Viewer',
};

export function MembersPanel({ projectId, isOwner, onClose }: MembersPanelProps) {
  const { members, fetchMembers, removeMember, updateMemberRole } = useCollabStore();

  useEffect(() => {
    fetchMembers(projectId);
  }, [projectId]);

  const handleRoleChange = async (memberId: string, role: 'editor' | 'viewer') => {
    await updateMemberRole(memberId, role);
    toast.success('Role updated');
  };

  const handleRemove = async (memberId: string, email: string) => {
    if (!confirm(`Remove ${email} from this project?`)) return;
    await removeMember(memberId);
    toast.success('Member removed');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card-elevated" style={{ width: 460, padding: 28, animation: 'fadeIn 0.2s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              👥 Members
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              {members.length} member{members.length !== 1 ? 's' : ''} with access
            </p>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Member list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
          {members.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '24px 0' }}>
              No members yet — share a link to invite collaborators
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 14px',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: colorForUser(member.userId),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#11111b',
                  textTransform: 'uppercase', flexShrink: 0,
                }}>
                  {member.email.charAt(0)}
                </div>

                {/* Email + joined */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.email}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Role */}
                {member.role === 'owner' || !isOwner ? (
                  <span style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 4,
                    background: 'var(--bg-card)', color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}>
                    {ROLE_LABELS[member.role]}
                  </span>
                ) : (
                  <select
                    className="input"
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as 'editor' | 'viewer')}
                    style={{ width: 110, padding: '3px 8px', fontSize: 12 }}
                  >
                    <option value="editor">✏️ Editor</option>
                    <option value="viewer">👁 Viewer</option>
                  </select>
                )}

                {/* Remove */}
                {isOwner && member.role !== 'owner' && (
                  <button
                    className="btn btn-danger btn-sm btn-icon"
                    onClick={() => handleRemove(member.id, member.email)}
                    data-tooltip="Remove member"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
