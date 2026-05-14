import { useState } from 'react';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import toast from 'react-hot-toast';

export function ApiInfoForm() {
  const { spec, updateInfo, setGlobalSecurity, setOpenApiVersion } = useApiSpecStore();
  const [activeTab, setActiveTab] = useState<'info' | 'servers' | 'security'>('info');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.2s ease' }}>
      {/* Hero card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(137,180,250,0.1), rgba(203,166,247,0.1))',
        border: '1px solid rgba(137,180,250,0.2)', borderRadius: 12, padding: 20,
      }}>
        <div style={{ fontSize: 20, marginBottom: 4 }}>⚡ Modern API Studio</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Design, build, and document your APIs visually. Select an endpoint from the sidebar or configure your API info below.
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 0 }}>
        <button className={`tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>API Information</button>
        <button className={`tab ${activeTab === 'servers' ? 'active' : ''}`} onClick={() => setActiveTab('servers')}>Environment Servers</button>
        <button className={`tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Global Security</button>
      </div>

      {activeTab === 'info' && (
        <div className="card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent-blue)' }}>ℹ</span> API Information
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="label">API Title *</label>
            <input className="input" value={spec.info.title} onChange={(e) => updateInfo({ title: e.target.value })} placeholder="My API" />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">Version *</label>
              <input className="input" value={spec.info.version} onChange={(e) => updateInfo({ version: e.target.value })} placeholder="1.0.0" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">OpenAPI Version</label>
              <select className="input" value={spec.openApiVersion} onChange={(e) => setOpenApiVersion(e.target.value as 'openapi3' | 'swagger2')}>
                <option value="openapi3">OpenAPI 3.0</option>
                <option value="swagger2">Swagger 2.0</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" value={spec.info.description || ''} onChange={(e) => updateInfo({ description: e.target.value })} placeholder="Describe your API..." style={{ minHeight: 72 }} />
          </div>
          <div className="form-group">
            <label className="label">Contact Email</label>
            <input className="input" value={spec.info.contact?.email || ''} onChange={(e) => updateInfo({ contact: { ...spec.info.contact, email: e.target.value } })} placeholder="api@example.com" />
          </div>
          </div>
        </div>
      )}

      {activeTab === 'servers' && (
        <div className="card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent-teal)' }}>⛁</span> Environment Servers
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
          Define base URLs for your environments. You can assign a Variable Name (e.g., "URL") to use it like <code>{"{{URL}}"}</code> in the Test Runner.
        </div>
        {spec.servers.map((srv, i) => (
          <div key={i} className="form-row" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">Var Name</label>
              <input className="input input-mono" value={srv.name || ''} onChange={(e) => {
                const servers = [...spec.servers];
                servers[i] = { ...servers[i], name: e.target.value };
                useApiSpecStore.getState().setSpec({ ...spec, servers });
              }} placeholder="URL" />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="label">Server URL</label>
              <input className="input input-mono" value={srv.url} onChange={(e) => {
                const servers = [...spec.servers];
                servers[i] = { ...servers[i], url: e.target.value };
                useApiSpecStore.getState().setSpec({ ...spec, servers });
              }} placeholder="https://api.example.com" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">Description</label>
              <input className="input" value={srv.description || ''} onChange={(e) => {
                const servers = [...spec.servers];
                servers[i] = { ...servers[i], description: e.target.value };
                useApiSpecStore.getState().setSpec({ ...spec, servers });
              }} placeholder="Production" />
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" style={{ marginTop: 26, color: 'var(--accent-red)' }} onClick={() => {
              const servers = spec.servers.filter((_, idx) => idx !== i);
              useApiSpecStore.getState().setSpec({ ...spec, servers });
            }}>✕</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => {
          const servers = [...spec.servers, { name: 'URL', url: 'https://', description: 'New Environment' }];
          useApiSpecStore.getState().setSpec({ ...spec, servers });
        }}>+ Add Server</button>
      </div>
      )}

      {activeTab === 'security' && (
        <div className="card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent-yellow)' }}>🔒</span> Global Security
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {spec.components.securitySchemes.map((ss) => (
            <label key={ss.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={spec.globalSecurity.includes(ss.name)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...spec.globalSecurity, ss.name]
                    : spec.globalSecurity.filter((s) => s !== ss.name);
                  setGlobalSecurity(next);
                }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{ss.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({ss.type})</span>
            </label>
          ))}
          {spec.components.securitySchemes.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No security schemes defined. Add them in the Security tab.</div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
