import type { Endpoint, EndpointParameter, ParameterLocation, SchemaType } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';
import { extractPathParams } from '@modern-api-studio/utils';

interface Props { endpoint: Endpoint; update: (c: Partial<Endpoint>) => void; }

const PARAM_TYPES: SchemaType[] = ['string', 'integer', 'number', 'boolean', 'array'];

export function ParamsEditor({ endpoint, update }: Props) {
  const addParam = (location: ParameterLocation) => {
    const p: EndpointParameter = { id: uuidv4(), name: '', in: location, required: location === 'path', description: '', schema: { type: 'string' } };
    update({ parameters: [...endpoint.parameters, p] });
  };

  const updateParam = (id: string, changes: Partial<EndpointParameter>) => {
    update({ parameters: endpoint.parameters.map((p) => p.id === id ? { ...p, ...changes, schema: { ...p.schema, ...(changes.schema || {}) } } : p) });
  };

  const removeParam = (id: string) => {
    update({ parameters: endpoint.parameters.filter((p) => p.id !== id) });
  };

  const syncPathParams = () => {
    const detected = extractPathParams(endpoint.path);
    const existingNames = endpoint.parameters.filter((p) => p.in === 'path').map((p) => p.name);
    const toAdd = detected.filter((d) => !existingNames.includes(d.name));
    if (toAdd.length > 0) update({ parameters: [...endpoint.parameters, ...toAdd] });
  };

  const grouped: Record<ParameterLocation, EndpointParameter[]> = { path: [], query: [], header: [], cookie: [] };
  for (const p of endpoint.parameters) grouped[p.in]?.push(p);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{endpoint.parameters.length} parameter(s)</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={syncPathParams} data-tooltip="Auto-detect from path">⟳ Sync Path</button>
          <button className="btn btn-ghost btn-sm" onClick={() => addParam('query')}>+ Query</button>
          <button className="btn btn-ghost btn-sm" onClick={() => addParam('header')}>+ Header</button>
          <button className="btn btn-ghost btn-sm" onClick={() => addParam('cookie')}>+ Cookie</button>
          <button className="btn btn-ghost btn-sm" onClick={() => addParam('path')}>+ Path</button>
        </div>
      </div>

      {(['path', 'query', 'header', 'cookie'] as ParameterLocation[]).map((loc) =>
        grouped[loc].length > 0 && (
          <div key={loc} className="card" style={{ padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{loc} Parameters</div>
            {grouped[loc].map((p) => (
              <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 8, padding: 8, background: 'var(--bg-overlay)', borderRadius: 6 }}>
                <div style={{ flex: 1 }}>
                  <input className="input input-mono" style={{ marginBottom: 4, fontSize: 12 }} value={p.name}
                    onChange={(e) => updateParam(p.id, { name: e.target.value })} placeholder="param_name" />
                  <input className="input" style={{ fontSize: 12 }} value={p.description || ''} onChange={(e) => updateParam(p.id, { description: e.target.value })} placeholder="Description..." />
                </div>
                <div style={{ width: 90 }}>
                  <select className="input" style={{ fontSize: 12, marginBottom: 4 }} value={p.schema.type}
                    onChange={(e) => {
                      const type = e.target.value as SchemaType;
                      updateParam(p.id, { 
                        schema: type === 'array' 
                          ? { ...p.schema, type, items: { id: uuidv4(), name: 'items', type: 'string', required: true } }
                          : { ...p.schema, type }
                      });
                    }}>
                    {PARAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={p.required} onChange={(e) => updateParam(p.id, { required: e.target.checked })} />
                    required
                  </label>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeParam(p.id)} style={{ color: 'var(--accent-red)' }}>✕</button>
              </div>
            ))}
          </div>
        )
      )}

      {endpoint.parameters.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 24, border: '1px dashed var(--border)', borderRadius: 8 }}>
          No parameters. Use the buttons above to add path, query, header, or cookie params.
        </div>
      )}
    </div>
  );
}
