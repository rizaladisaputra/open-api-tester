import { useUiStore } from './store/useUiStore';
import { useApiSpecStore } from './store/useApiSpecStore';
import { useCollabStore } from './store/useCollabStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { DesignerPanel } from './components/designer/DesignerPanel';
import { ApiInfoForm } from './components/designer/ApiInfoForm';
import { ConverterPanel } from './components/converter/ConverterPanel';
import { ComponentsPanel } from './components/components/ComponentsPanel';
import { SecurityPanel } from './components/security/SecurityPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { JoinProjectPage } from './components/collab/JoinProjectPage';
import { supabase } from './lib/supabase';
import { useEffect, useState } from 'react';

export default function App() {
  const { activePanel } = useUiStore();
  const { activeProjectId, currentUserRole } = useApiSpecStore();
  const { subscribeToProject, unsubscribeFromProject } = useCollabStore();

  const [session, setSession] = useState<any>(null);
  const [inDashboard, setInDashboard] = useState(true);

  // Read invite token once from URL on mount — stored in state so it can be
  // cleared after accept/cancel without a full page reload.
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite');
  });

  // ── Auth state ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setInDashboard(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Realtime: subscribe when a project becomes active ─────────────────────
  useEffect(() => {
    if (!activeProjectId || !session) return;

    subscribeToProject(
      activeProjectId,
      { id: session.user.id, email: session.user.email ?? '' },
      currentUserRole ?? 'viewer',
    );

    return () => unsubscribeFromProject();
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear invite token from address bar without reload ────────────────────
  const clearInviteFromUrl = () => {
    window.history.replaceState({}, '', window.location.pathname);
    setInviteToken(null);
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'home':       return <div className="scroll-y" style={{ padding: 24, display: 'flex', justifyContent: 'center' }}><div style={{ width: '100%', maxWidth: 800 }}><ApiInfoForm /></div></div>;
      case 'designer':   return <DesignerPanel />;
      case 'converter':  return <ConverterPanel />;
      case 'components': return <ComponentsPanel />;
      case 'security':   return <SecurityPanel />;
      case 'preview':    return <PreviewPanel />;
      default:           return <DesignerPanel />;
    }
  };

  // ── Render order ──────────────────────────────────────────────────────────

  // 1. Must be authenticated first
  if (!session) {
    return <Auth />;
  }

  // 2. Invite flow — shown after login so user context is available
  if (inviteToken) {
    return (
      <JoinProjectPage
        token={inviteToken}
        onJoined={() => {
          clearInviteFromUrl();
          setInDashboard(false); // go straight into the project editor
        }}
        onCancel={() => {
          clearInviteFromUrl();
          setInDashboard(true);
        }}
      />
    );
  }

  // 3. Dashboard — project picker
  if (inDashboard) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Dashboard onProjectSelect={() => setInDashboard(false)} />
      </div>
    );
  }

  // 4. Main editor
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>
      <Header onBackToDashboard={() => setInDashboard(true)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease' }}>
          {renderPanel()}
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
