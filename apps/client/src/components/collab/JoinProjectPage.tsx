import { useEffect, useState } from 'react';
import { useCollabStore } from '../../store/useCollabStore';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface JoinProjectPageProps {
  token: string;
  onJoined: () => void;
  onCancel: () => void;
}

type Status = 'loading' | 'valid' | 'invalid' | 'expired' | 'joining';

interface InviteInfo {
  projectName: string;
  role: 'editor' | 'viewer';
  expiresAt: string | null;
}

export function JoinProjectPage({ token, onJoined, onCancel }: JoinProjectPageProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const { acceptInvite } = useCollabStore();
  const { loadProjectFromSupabase } = useApiSpecStore();

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    setStatus('loading');
    const { data: invite } = await supabase
      .from('project_invites')
      .select('role, expires_at, max_uses, use_count, project_id')
      .eq('token', token)
      .single();

    if (!invite) { setStatus('invalid'); return; }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      setStatus('expired'); return;
    }
    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      setStatus('expired'); return;
    }

    // Fetch project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', invite.project_id)
      .single();

    setInfo({
      projectName: project?.name ?? 'Untitled Project',
      role: invite.role as 'editor' | 'viewer',
      expiresAt: invite.expires_at,
    });
    setStatus('valid');
  };

  const handleAccept = async () => {
    setStatus('joining');
    const result = await acceptInvite(token);
    if (!result) {
      toast.error('Failed to join project. The link may have expired.');
      setStatus('invalid');
      return;
    }
    await loadProjectFromSupabase(result.projectId, result.role as 'owner' | 'editor' | 'viewer');
    toast.success(`Joined as ${result.role}!`);
    onJoined();
  };

  const roleColor = info?.role === 'editor' ? 'var(--accent-blue)' : 'var(--accent-green)';
  const roleBg = info?.role === 'editor' ? 'rgba(137,180,250,0.15)' : 'rgba(166,227,161,0.15)';
  const roleBorder = info?.role === 'editor' ? 'rgba(137,180,250,0.3)' : 'rgba(166,227,161,0.3)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-base)',
    }}>
      <div className="card-elevated" style={{ width: 420, padding: 36, textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
        {/* Logo */}
        <div style={{
          width: 52, height: 52, borderRadius: 12, margin: '0 auto 20px',
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, boxShadow: '0 0 24px rgba(137,180,250,0.3)',
        }}>⚡</div>

        {status === 'loading' && (
          <>
            <h2 style={{ fontSize: 20, marginBottom: 8, color: 'var(--text-primary)' }}>Validating invite…</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Please wait a moment</p>
          </>
        )}

        {(status === 'invalid' || status === 'expired') && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{status === 'expired' ? '⏱' : '❌'}</div>
            <h2 style={{ fontSize: 20, marginBottom: 8, color: 'var(--text-primary)' }}>
              {status === 'expired' ? 'Link Expired' : 'Invalid Link'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
              {status === 'expired'
                ? 'This invite link has expired or reached its usage limit.'
                : 'This invite link is invalid or has been revoked.'}
            </p>
            <button className="btn btn-ghost" onClick={onCancel} style={{ width: '100%', justifyContent: 'center' }}>
              Go to Dashboard
            </button>
          </>
        )}

        {(status === 'valid' || status === 'joining') && info && (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>You've been invited to join</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              {info.projectName}
            </h2>

            {/* Role badge */}
            <div style={{ marginBottom: 20 }}>
              <span style={{
                display: 'inline-block', fontSize: 12, fontWeight: 600,
                padding: '5px 14px', borderRadius: 20,
                background: roleBg, color: roleColor, border: `1px solid ${roleBorder}`,
              }}>
                {info.role === 'editor' ? '✏️ Editor — can view & save' : '👁 Viewer — read-only'}
              </span>
            </div>

            {info.expiresAt && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
                Link expires {new Date(info.expiresAt).toLocaleDateString()}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={handleAccept}
                disabled={status === 'joining'}
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              >
                {status === 'joining' ? 'Joining…' : '✓ Accept & Open Project'}
              </button>
              <button className="btn btn-ghost" onClick={onCancel} style={{ width: '100%', justifyContent: 'center' }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
