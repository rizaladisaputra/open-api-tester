import { useCollabStore, colorForUser } from '../../store/useCollabStore';

interface CollaboratorsBarProps {
  onShareClick: () => void;
}

export function CollaboratorsBar({ onShareClick }: CollaboratorsBarProps) {
  const { onlineUsers } = useCollabStore();

  const MAX_VISIBLE = 4;
  const visible = onlineUsers.slice(0, MAX_VISIBLE);
  const overflow = onlineUsers.length - MAX_VISIBLE;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {/* Avatar stack */}
      {onlineUsers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {visible.map((u, i) => (
            <div
              key={u.userId}
              data-tooltip={`${u.email} (${u.role})`}
              style={{
                width: 26, height: 26, borderRadius: '50%',
                background: colorForUser(u.userId),
                border: '2px solid var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#11111b',
                marginLeft: i === 0 ? 0 : -8,
                cursor: 'default',
                zIndex: MAX_VISIBLE - i,
                position: 'relative',
                textTransform: 'uppercase',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {u.email.charAt(0)}
            </div>
          ))}
          {overflow > 0 && (
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--bg-overlay)', border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
              marginLeft: -8, position: 'relative', zIndex: 0,
            }}>
              +{overflow}
            </div>
          )}
        </div>
      )}

      {/* Online count pill */}
      {onlineUsers.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
          {onlineUsers.length} online
        </div>
      )}

      {/* Share button */}
      <button className="btn btn-ghost btn-sm" onClick={onShareClick} style={{ gap: 5 }}>
        <span>🔗</span>
        <span>Share</span>
      </button>
    </div>
  );
}
