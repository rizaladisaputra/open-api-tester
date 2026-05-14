import type { Endpoint, ResponseDefinition, SchemaProperty, SchemaType } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { jsonToSchema } from '@modern-api-studio/utils';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import { SchemaBuilder } from '../shared/SchemaBuilder';

interface Props { endpoint: Endpoint; update: (c: Partial<Endpoint>) => void; }

const COMMON_STATUSES = [
  { code: '200', label: 'OK' }, { code: '201', label: 'Created' }, { code: '204', label: 'No Content' },
  { code: '400', label: 'Bad Request' }, { code: '401', label: 'Unauthorized' }, { code: '403', label: 'Forbidden' },
  { code: '404', label: 'Not Found' }, { code: '422', label: 'Unprocessable Entity' }, { code: '500', label: 'Internal Server Error' },
];

function statusColor(code: string) {
  if (code.startsWith('2')) return 'var(--accent-green)';
  if (code.startsWith('3')) return 'var(--accent-teal)';
  if (code.startsWith('4')) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}

export function ResponseEditor({ endpoint, update }: Props) {
  const spec = useApiSpecStore(s => s.spec);

  const addResponse = (code?: string) => {
    const existing = endpoint.responses.map((r) => r.statusCode);
    const status = code || COMMON_STATUSES.find((s) => !existing.includes(s.code))?.code || '200';
    const desc = COMMON_STATUSES.find((s) => s.code === status)?.label || 'Response';
    const r: ResponseDefinition = { id: uuidv4(), statusCode: status, description: desc, schema: [] };
    update({ responses: [...endpoint.responses, r] });
  };

  const updateResponse = (id: string, changes: Partial<ResponseDefinition>) => {
    update({ responses: endpoint.responses.map((r) => r.id === id ? { ...r, ...changes } : r) });
  };

  const removeResponse = (id: string) => {
    update({ responses: endpoint.responses.filter((r) => r.id !== id) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Quick add */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Quick add:</span>
        {COMMON_STATUSES.map((s) => (
          <button key={s.code} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px', color: statusColor(s.code), borderColor: 'transparent' }}
            onClick={() => addResponse(s.code)}>{s.code}</button>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => addResponse()}>+ Custom</button>
      </div>

      {/* Response cards */}
      {endpoint.responses.map((resp) => (
        <div key={resp.id} className="card" style={{ padding: 12, borderLeft: `3px solid ${statusColor(resp.statusCode)}` }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 14, color: statusColor(resp.statusCode) }}>
              {resp.statusCode}
            </span>
            <input className="input" value={resp.description} onChange={(e) => updateResponse(resp.id, { description: e.target.value })}
              placeholder="Response description" style={{ flex: 1, fontSize: 13 }} />
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeResponse(resp.id)} style={{ color: 'var(--accent-red)' }}>✕</button>
          </div>

          {/* Status code edit */}
          <div className="form-row" style={{ marginBottom: 8 }}>
            <div className="form-group" style={{ width: 120 }}>
              <label className="label">Status Code</label>
              <input className="input input-mono" value={resp.statusCode} onChange={(e) => updateResponse(resp.id, { statusCode: e.target.value })} />
            </div>
            <div className="form-group" style={{ width: 140 }}>
              <label className="label">Content Type</label>
              <input className="input" value={resp.contentType || 'application/json'} onChange={(e) => updateResponse(resp.id, { contentType: e.target.value })} />
            </div>
          </div>

          {/* Schema fields or Raw JSON */}
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Schema Definition</span>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-overlay)', padding: 4, borderRadius: 6 }}>
                <button className={`btn btn-sm ${resp.mode !== 'raw' && resp.mode !== 'ref' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateResponse(resp.id, { mode: 'visual' })}>Builder</button>
                <button className={`btn btn-sm ${resp.mode === 'raw' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateResponse(resp.id, { mode: 'raw' })}>Raw JSON</button>
                <button className={`btn btn-sm ${resp.mode === 'ref' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => updateResponse(resp.id, { mode: 'ref' })}>Use Schema</button>
              </div>
            </div>
            
            {resp.mode === 'ref' ? (
              <div style={{ padding: 12, textAlign: 'center', background: 'var(--bg-overlay)', borderRadius: 6 }}>
                <div style={{ fontSize: 11, marginBottom: 8, color: 'var(--text-secondary)' }}>Select reusable schema from Components:</div>
                <select className="input" style={{ width: '100%', maxWidth: 200, margin: '0 auto', display: 'block', fontSize: 11 }} value={resp.ref || ''} onChange={e => updateResponse(resp.id, { ref: e.target.value })}>
                  <option value="">-- Select Schema --</option>
                  {spec.components.schemas.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            ) : resp.mode === 'raw' ? (
              <div style={{ marginTop: 8 }}>
                <textarea className="input input-mono" style={{ minHeight: 120, fontSize: 11, marginBottom: 4 }} 
                  value={resp.rawJson || ''} 
                  onChange={(e) => updateResponse(resp.id, { rawJson: e.target.value })} 
                  placeholder='{\n  "id": 1,\n  "status": "success"\n}' />
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>This JSON will be automatically parsed to generate the schema.</div>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <SchemaBuilder properties={resp.schema || []} onChange={p => updateResponse(resp.id, { schema: p })} />
              </div>
            )}
          </div>
        </div>
      ))}

      {endpoint.responses.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 24, border: '1px dashed var(--border)', borderRadius: 8 }}>
          No responses defined. Use the quick add buttons above.
        </div>
      )}
    </div>
  );
}
