import { useState } from 'react';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import { apiSpecToOpenApi3 } from '@modern-api-studio/utils';
import MonacoEditor from '@monaco-editor/react';
import { generateMockFromSchema } from '@modern-api-studio/utils';
import type { HttpMethod } from '@modern-api-studio/types';
import toast from 'react-hot-toast';
import { TestRunner } from './TestRunner';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#a6e3a1', POST: '#89b4fa', PUT: '#f9e2af', PATCH: '#fab387', DELETE: '#f38ba8',
};

export function PreviewPanel() {
  const { spec } = useApiSpecStore();
  const [activeEndpointId, setActiveEndpointId] = useState<string | null>(spec.endpoints[0]?.id ?? null);
  const [activeView, setActiveView] = useState<'endpoints' | 'spec'>('endpoints');
  const activeEndpoint = spec.endpoints.find((e) => e.id === activeEndpointId);

  const yamlOutput = apiSpecToOpenApi3(spec, 'yaml');
  const jsonOutput = apiSpecToOpenApi3(spec, 'json');

  // Group by tags
  const groups: Record<string, typeof spec.endpoints> = {};
  for (const ep of spec.endpoints) {
    const tag = ep.tags[0] || 'Default';
    if (!groups[tag]) groups[tag] = [];
    groups[tag].push(ep);
  }

  // Generate mock for active endpoint
  const getMock = () => {
    if (!activeEndpoint) return null;
    const schemas = spec.components.schemas.reduce((acc, s) => {
      acc[s.name] = {
        type: 'object',
        properties: Object.fromEntries(s.properties.map((p) => [p.name, { type: p.type, format: p.format, example: p.example }])),
      };
      return acc;
    }, {} as Record<string, unknown>);

    if (activeEndpoint.requestBody?.schema?.length) {
      const bodySchema = {
        type: 'object',
        properties: Object.fromEntries(activeEndpoint.requestBody.schema.map((p) => [p.name, { type: p.type, format: p.format, example: p.example }])),
      } as Record<string, unknown>;
      return generateMockFromSchema(bodySchema, schemas as Record<string, Record<string, unknown>>);
    }
    return { message: 'No request body', id: 1 };
  };

  const mock = getMock();
  const mockStr = mock ? JSON.stringify(mock, null, 2) : '{}';

  // removed inline handleTestRequest logic

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: endpoint list */}
      <div style={{ width: 280, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}>
          <button className={`tab ${activeView === 'endpoints' ? 'active' : ''}`} onClick={() => setActiveView('endpoints')}>Endpoints</button>
          <button className={`tab ${activeView === 'spec' ? 'active' : ''}`} onClick={() => setActiveView('spec')}>Full Spec</button>
        </div>

        {activeView === 'endpoints' ? (
          <div className="scroll-y" style={{ flex: 1, padding: '8px 0' }}>
            {Object.entries(groups).map(([tag, eps]) => (
              <div key={tag}>
                <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tag}</div>
                {eps.map((ep) => (
                  <button key={ep.id} onClick={() => setActiveEndpointId(ep.id)}
                    className={`sidebar-item ${activeEndpointId === ep.id ? 'active' : ''}`}
                    style={{ paddingLeft: 20, gap: 8 }}>
                    <span className={`method-badge badge-${ep.method.toLowerCase()}`}>{ep.method}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.path}</span>
                    {ep.security?.length ? <span style={{ marginLeft: 'auto', fontSize: 12 }}>🔒</span> : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '8px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { navigator.clipboard.writeText(yamlOutput); toast.success('YAML copied!'); }}>⎘ YAML</button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { navigator.clipboard.writeText(jsonOutput); toast.success('JSON copied!'); }}>⎘ JSON</button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{spec.endpoints.length} endpoints · {spec.components.schemas.length} schemas · v{spec.info.version}</div>
          </div>
        )}
      </div>

      {/* Right: Preview detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeView === 'spec' ? (
          <MonacoEditor height="100%" language="yaml" value={yamlOutput} theme="vs-dark"
            options={{ readOnly: true, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', minimap: { enabled: true }, scrollBeyondLastLine: false, automaticLayout: true }} />
        ) : activeEndpoint ? (
          <div className="scroll-y" style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Endpoint header */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(137,180,250,0.1), rgba(203,166,247,0.1))',
              border: '1px solid rgba(137,180,250,0.2)', borderRadius: 12, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className={`method-badge badge-${activeEndpoint.method.toLowerCase()}`} style={{ fontSize: 12, padding: '4px 12px' }}>{activeEndpoint.method}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600 }}>{activeEndpoint.path}</span>
                {activeEndpoint.deprecated && <span style={{ fontSize: 11, color: 'var(--accent-yellow)', background: 'rgba(249,226,175,0.1)', padding: '2px 8px', borderRadius: 4 }}>Deprecated</span>}
                {activeEndpoint.security?.length ? <span style={{ marginLeft: 'auto' }}>🔒 Protected</span> : <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>🔓 Public</span>}
              </div>
              {activeEndpoint.summary && <div style={{ fontWeight: 600, marginBottom: 4 }}>{activeEndpoint.summary}</div>}
              {activeEndpoint.description && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{activeEndpoint.description}</div>}
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {activeEndpoint.tags.map((t) => (
                  <span key={t} style={{ fontSize: 11, background: 'rgba(203,166,247,0.15)', color: 'var(--accent-purple)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(203,166,247,0.25)' }}>{t}</span>
                ))}
              </div>
            </div>

            {/* HTTP Request Test Runner */}
            <TestRunner endpoint={activeEndpoint} mockBodyStr={mockStr} />

            {/* Parameters */}
            {activeEndpoint.parameters.length > 0 && (
              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>Parameters</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>In</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>Required</th>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEndpoint.parameters.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '6px 8px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-blue)' }}>{p.name}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{p.in}</td>
                        <td style={{ padding: '6px 8px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-teal)' }}>{p.schema.type}</td>
                        <td style={{ padding: '6px 8px', color: p.required ? 'var(--accent-red)' : 'var(--text-muted)' }}>{p.required ? '✓' : '—'}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{p.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mock Request */}
            {activeEndpoint.requestBody && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Mock Request Body</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(mockStr); toast.success('Copied!'); }}>⎘ Copy</button>
                </div>
                <div className="code-block" style={{ fontSize: 11, maxHeight: 200 }}>{mockStr}</div>
              </div>
            )}

            {/* Responses */}
            {activeEndpoint.responses.length > 0 && (
              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>Responses</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeEndpoint.responses.map((r) => {
                    const color = r.statusCode.startsWith('2') ? 'var(--accent-green)' : r.statusCode.startsWith('4') ? 'var(--accent-yellow)' : 'var(--accent-red)';
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-overlay)', borderRadius: 6, borderLeft: `3px solid ${color}` }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color, minWidth: 40 }}>{r.statusCode}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.description}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
            Select an endpoint to preview
          </div>
        )}
      </div>
    </div>
  );
}
