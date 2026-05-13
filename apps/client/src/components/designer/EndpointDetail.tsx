import { useState } from 'react';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import type { Endpoint, HttpMethod, EndpointParameter, ResponseDefinition, SchemaProperty } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';
import { ParamsEditor } from './ParamsEditor';
import { RequestBodyEditor } from './RequestBodyEditor';
import { ResponseEditor } from './ResponseEditor';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

type DetailTab = 'info' | 'params' | 'body' | 'responses' | 'auth';

interface Props { endpoint: Endpoint; }

export function EndpointDetail({ endpoint }: Props) {
  const { spec, updateEndpoint, deleteEndpoint } = useApiSpecStore();
  const [activeTab, setActiveTab] = useState<DetailTab>('info');

  const update = (changes: Partial<Endpoint>) => updateEndpoint(endpoint.id, changes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, animation: 'fadeIn 0.2s ease' }}>
      {/* Endpoint header */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
          <select className="input" value={endpoint.method}
            onChange={(e) => update({ method: e.target.value as HttpMethod })}
            style={{ width: 110, flexShrink: 0 }}>
            {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input className="input input-mono" value={endpoint.path}
            onChange={(e) => update({ path: e.target.value })}
            placeholder="/api/v1/resource/{id}" style={{ flex: 1 }} />
          <button className="btn btn-danger btn-sm" onClick={() => deleteEndpoint(endpoint.id)}>✕</button>
        </div>

        {/* Status indicators */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`method-badge badge-${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
          {endpoint.security && endpoint.security.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: 4 }}>🔒 Protected</span>
          )}
          {endpoint.deprecated && (
            <span style={{ fontSize: 11, color: 'var(--accent-yellow)', background: 'rgba(249,226,175,0.1)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(249,226,175,0.2)' }}>⚠ Deprecated</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{endpoint.responses.length} response{endpoint.responses.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 12 }}>
        {(['info', 'params', 'body', 'responses', 'auth'] as DetailTab[]).map((t) => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}
            style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && <InfoTab endpoint={endpoint} update={update} spec={spec} />}
      {activeTab === 'params' && <ParamsEditor endpoint={endpoint} update={update} />}
      {activeTab === 'body' && <RequestBodyEditor endpoint={endpoint} update={update} />}
      {activeTab === 'responses' && <ResponseEditor endpoint={endpoint} update={update} />}
      {activeTab === 'auth' && <AuthTab endpoint={endpoint} update={update} spec={spec} />}
    </div>
  );
}

function InfoTab({ endpoint, update, spec }: { endpoint: Endpoint; update: (c: Partial<Endpoint>) => void; spec: ReturnType<typeof useApiSpecStore.getState>['spec'] }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="label">Summary</label>
          <input className="input" value={endpoint.summary || ''} onChange={(e) => update({ summary: e.target.value })} placeholder="Brief description" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="label">Operation ID</label>
          <input className="input input-mono" value={endpoint.operationId || ''} onChange={(e) => update({ operationId: e.target.value })} placeholder="getUsers" />
        </div>
      </div>
      <div className="form-group">
        <label className="label">Description</label>
        <textarea className="input" value={endpoint.description || ''} onChange={(e) => update({ description: e.target.value })} placeholder="Detailed description..." />
      </div>
      <div className="form-group">
        <label className="label">Tags</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {spec.tags.map((tag) => {
            const active = endpoint.tags.includes(tag.name);
            return (
              <button key={tag.id} onClick={() => {
                const next = active ? endpoint.tags.filter((t) => t !== tag.name) : [...endpoint.tags, tag.name];
                update({ tags: next });
              }} style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                background: active ? 'rgba(203,166,247,0.2)' : 'var(--bg-overlay)',
                color: active ? 'var(--accent-purple)' : 'var(--text-muted)',
                border: active ? '1px solid rgba(203,166,247,0.4)' : '1px solid var(--border)',
              }}>{tag.name}</button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <span className="label" style={{ margin: 0 }}>Deprecated</span>
          <label className="toggle"><input type="checkbox" checked={endpoint.deprecated} onChange={(e) => update({ deprecated: e.target.checked })} /><span className="toggle-slider" /></label>
        </label>
      </div>
    </div>
  );
}

function AuthTab({ endpoint, update, spec }: { endpoint: Endpoint; update: (c: Partial<Endpoint>) => void; spec: ReturnType<typeof useApiSpecStore.getState>['spec'] }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Endpoint Security</div>
      {spec.components.securitySchemes.map((ss) => {
        const active = (endpoint.security || []).includes(ss.name);
        return (
          <label key={ss.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: active ? 'rgba(137,180,250,0.08)' : 'transparent', border: active ? '1px solid rgba(137,180,250,0.2)' : '1px solid transparent' }}>
            <input type="checkbox" checked={active} onChange={(e) => {
              const next = e.target.checked
                ? [...(endpoint.security || []), ss.name]
                : (endpoint.security || []).filter((s) => s !== ss.name);
              update({ security: next });
            }} />
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 500 }}>{ss.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ss.type} — {ss.description || 'No description'}</div>
            </div>
            {active && <span style={{ marginLeft: 'auto', fontSize: 14 }}>🔒</span>}
          </label>
        );
      })}
      {spec.components.securitySchemes.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No security schemes defined. Add them in the Security tab.</div>
      )}
    </div>
  );
}
