import { useState } from 'react';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import type { SecurityScheme, SecuritySchemeType } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const SCHEME_TYPES: { value: SecuritySchemeType; label: string; desc: string; icon: string }[] = [
  { value: 'bearer', label: 'Bearer Token', desc: 'JWT / OAuth2 Bearer', icon: '🎫' },
  { value: 'basic', label: 'Basic Auth', desc: 'Username & Password', icon: '🔑' },
  { value: 'apiKey', label: 'API Key', desc: 'Header, Query, or Cookie', icon: '🗝' },
  { value: 'oauth2', label: 'OAuth 2.0', desc: 'Authorization flows', icon: '⚡' },
];

export function SecurityPanel() {
  const { spec, addSecurityScheme, updateSecurityScheme, deleteSecurityScheme, setGlobalSecurity } = useApiSpecStore();
  const [activeId, setActiveId] = useState<string | null>(spec.components.securitySchemes[0]?.id ?? null);
  const active = spec.components.securitySchemes.find((s) => s.id === activeId);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: scheme list */}
      <div style={{ width: 240, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>🔒 Security Schemes</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => {
            addSecurityScheme({ name: 'newAuth', type: 'bearer', description: '' });
            const newId = useApiSpecStore.getState().spec.components.securitySchemes.at(-1)?.id;
            if (newId) setActiveId(newId);
          }}>+</button>
        </div>

        <div className="scroll-y" style={{ flex: 1, padding: '6px 0' }}>
          {spec.components.securitySchemes.map((ss) => {
            const meta = SCHEME_TYPES.find((t) => t.value === ss.type);
            const isGlobal = spec.globalSecurity.includes(ss.name);
            return (
              <button key={ss.id} onClick={() => setActiveId(ss.id)}
                className={`sidebar-item ${activeId === ss.id ? 'active' : ''}`}
                style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                  <span>{meta?.icon || '🔒'}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{ss.name}</span>
                  {isGlobal && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent-green)', background: 'rgba(166,227,161,0.15)', padding: '1px 5px', borderRadius: 4 }}>global</span>}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 20 }}>{meta?.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global security section */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Global Security</div>
          {spec.components.securitySchemes.map((ss) => (
            <label key={ss.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6, fontSize: 12 }}>
              <input type="checkbox" checked={spec.globalSecurity.includes(ss.name)}
                onChange={(e) => {
                  const next = e.target.checked ? [...spec.globalSecurity, ss.name] : spec.globalSecurity.filter((s) => s !== ss.name);
                  setGlobalSecurity(next);
                }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{ss.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Right: scheme editor */}
      <div className="scroll-y" style={{ flex: 1, padding: 20 }}>
        {active ? (
          <SchemeEditor scheme={active}
            onUpdate={(c) => updateSecurityScheme(active.id, c)}
            onDelete={() => { deleteSecurityScheme(active.id); setActiveId(null); toast.success('Security scheme deleted'); }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48 }}>🔒</div>
            <div style={{ fontSize: 14 }}>Select or create a security scheme</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {SCHEME_TYPES.map((t) => (
                <button key={t.value} className="btn btn-ghost" onClick={() => {
                  addSecurityScheme({ name: `${t.value}Auth`, type: t.value });
                  const newId = useApiSpecStore.getState().spec.components.securitySchemes.at(-1)?.id;
                  if (newId) setActiveId(newId);
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SchemeEditor({ scheme, onUpdate, onDelete }: { scheme: SecurityScheme; onUpdate: (c: Partial<SecurityScheme>) => void; onDelete: () => void }) {
  const meta = SCHEME_TYPES.find((t) => t.value === scheme.type);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.2s ease' }}>
      {/* Type selector */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{meta?.icon} {meta?.label || 'Security Scheme'}</div>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
        </div>

        {/* Type cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
          {SCHEME_TYPES.map((t) => (
            <button key={t.value} onClick={() => onUpdate({ type: t.value })} style={{
              padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              background: scheme.type === t.value ? 'rgba(137,180,250,0.15)' : 'var(--bg-overlay)',
              border: scheme.type === t.value ? '1px solid rgba(137,180,250,0.4)' : '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 14, marginBottom: 2 }}>{t.icon} <strong style={{ fontSize: 12 }}>{t.label}</strong></div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</div>
            </button>
          ))}
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Scheme Name *</label>
            <input className="input input-mono" value={scheme.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="bearerAuth" />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 8 }}>
          <label className="label">Description</label>
          <input className="input" value={scheme.description || ''} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Scheme description" />
        </div>
      </div>

      {/* Type-specific fields */}
      {scheme.type === 'bearer' && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Bearer Token Config</div>
          <div className="form-group">
            <label className="label">Bearer Format</label>
            <input className="input" value={scheme.bearerFormat || 'JWT'} onChange={(e) => onUpdate({ bearerFormat: e.target.value })} placeholder="JWT" />
          </div>
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg-overlay)', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Example header:</div>
            <code style={{ fontSize: 11, color: 'var(--accent-green)' }}>Authorization: Bearer eyJhbGci...</code>
          </div>
        </div>
      )}

      {scheme.type === 'apiKey' && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>API Key Config</div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">Key Name</label>
              <input className="input input-mono" value={scheme.keyName || 'x-api-key'} onChange={(e) => onUpdate({ keyName: e.target.value })} placeholder="x-api-key" />
            </div>
            <div className="form-group" style={{ width: 120 }}>
              <label className="label">Location</label>
              <select className="input" value={scheme.in || 'header'} onChange={(e) => onUpdate({ in: e.target.value as 'header' | 'query' | 'cookie' })}>
                <option value="header">header</option>
                <option value="query">query</option>
                <option value="cookie">cookie</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {scheme.type === 'oauth2' && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>OAuth2 Flows</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { key: 'authorizationCode', label: 'Authorization Code' },
              { key: 'implicit', label: 'Implicit' },
              { key: 'password', label: 'Resource Owner Password' },
              { key: 'clientCredentials', label: 'Client Credentials' },
            ].map((flow) => (
              <div key={flow.key} style={{ padding: '8px 10px', background: 'var(--bg-overlay)', borderRadius: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>{flow.label}</div>
                {(flow.key === 'authorizationCode' || flow.key === 'implicit') && (
                  <input className="input input-mono" style={{ fontSize: 11, marginBottom: 6 }}
                    placeholder="Authorization URL"
                    value={(scheme.flows as Record<string, {authorizationUrl?: string}>)?.[flow.key]?.authorizationUrl || ''}
                    onChange={(e) => onUpdate({ flows: { ...scheme.flows, [flow.key]: { ...(scheme.flows as Record<string, unknown>)?.[flow.key] as object, authorizationUrl: e.target.value } } })} />
                )}
                {(flow.key === 'authorizationCode' || flow.key === 'password' || flow.key === 'clientCredentials') && (
                  <input className="input input-mono" style={{ fontSize: 11 }}
                    placeholder="Token URL"
                    value={(scheme.flows as Record<string, {tokenUrl?: string}>)?.[flow.key]?.tokenUrl || ''}
                    onChange={(e) => onUpdate({ flows: { ...scheme.flows, [flow.key]: { ...(scheme.flows as Record<string, unknown>)?.[flow.key] as object, tokenUrl: e.target.value } } })} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated YAML */}
      <div className="card">
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Generated OpenAPI</div>
        <div className="code-block" style={{ fontSize: 11 }}>
          {generateSchemeYaml(scheme)}
        </div>
      </div>
    </div>
  );
}

function generateSchemeYaml(s: SecurityScheme): string {
  if (s.type === 'bearer') return `${s.name}:\n  type: http\n  scheme: bearer\n  bearerFormat: ${s.bearerFormat || 'JWT'}`;
  if (s.type === 'basic') return `${s.name}:\n  type: http\n  scheme: basic`;
  if (s.type === 'apiKey') return `${s.name}:\n  type: apiKey\n  name: ${s.keyName || 'x-api-key'}\n  in: ${s.in || 'header'}`;
  if (s.type === 'oauth2') return `${s.name}:\n  type: oauth2\n  flows:\n    authorizationCode:\n      authorizationUrl: https://auth.example.com/oauth/authorize\n      tokenUrl: https://auth.example.com/oauth/token\n      scopes: {}`;
  return `${s.name}:\n  type: ${s.type}`;
}
