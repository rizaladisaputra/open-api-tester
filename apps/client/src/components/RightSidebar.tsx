import { useUiStore } from '../store/useUiStore';
import { useApiSpecStore } from '../store/useApiSpecStore';

export function RightSidebar() {
  const { 
    rightPanelCollapsed, 
    toggleRightPanel, 
    testActiveServer,
    setTestActiveServer,
    testAuthToken, 
    setTestAuthToken 
  } = useUiStore();
  const { spec } = useApiSpecStore();

  if (rightPanelCollapsed) {
    return (
      <aside style={{ width: 40, background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleRightPanel} data-tooltip="Expand Environment">«</button>
      </aside>
    );
  }

  return (
    <aside style={{ width: 260, background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Sidebar header */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Environment Variables</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleRightPanel} data-tooltip="Collapse">»</button>
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
            Environment
          </div>
          
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="label">Active Server</label>
            <select 
              className="input input-mono"
              value={testActiveServer || (spec.servers[0]?.name || '')}
              onChange={(e) => setTestActiveServer(e.target.value)}
            >
              {spec.servers.length === 0 && <option value="">No Servers Defined</option>}
              {spec.servers.map((srv, i) => (
                <option key={i} value={srv.name || `Server ${i + 1}`}>
                  {srv.name || `Server ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Auth Token</label>
            <textarea 
              className="input input-mono" 
              value={testAuthToken} 
              onChange={(e) => setTestAuthToken(e.target.value)} 
              placeholder="eyJhbGciOiJIUzI1Ni..." 
              style={{ minHeight: 80, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
