import { useState } from 'react';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import type { SchemaComponent, SchemaProperty } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { jsonToProperties } from '@modern-api-studio/utils';
import { SchemaBuilder } from '../shared/SchemaBuilder';
import { JsonEditor } from '../shared/JsonEditor';

export function ComponentsPanel() {
  const { spec, addSchema, updateSchema, deleteSchema } = useApiSpecStore();
  const [activeSchemaId, setActiveSchemaId] = useState<string | null>(spec.components.schemas[0]?.id ?? null);
  const activeSchema = spec.components.schemas.find((s) => s.id === activeSchemaId);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Schema list */}
      <div style={{ width: 220, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>◈ Schemas</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => {
            addSchema({ name: 'NewSchema', properties: [] });
            const newId = useApiSpecStore.getState().spec.components.schemas.at(-1)?.id;
            if (newId) setActiveSchemaId(newId);
          }}>+</button>
        </div>
        <div className="scroll-y" style={{ flex: 1, padding: '6px 0' }}>
          {spec.components.schemas.map((s) => (
            <button key={s.id} onClick={() => setActiveSchemaId(s.id)}
              className={`sidebar-item ${activeSchemaId === s.id ? 'active' : ''}`}
              style={{ padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{s.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.properties.length}</span>
            </button>
          ))}
          {spec.components.schemas.length === 0 && (
            <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>No schemas</div>
          )}
        </div>
      </div>

      {/* Schema editor */}
      <div className="scroll-y" style={{ flex: 1, padding: 20 }}>
        {activeSchema ? (
          <SchemaEditor schema={activeSchema} onUpdate={(c) => updateSchema(activeSchema.id, c)} onDelete={() => { deleteSchema(activeSchema.id); setActiveSchemaId(null); }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40 }}>◈</div>
            <div style={{ fontSize: 14 }}>Select or create a schema component</div>
            <button className="btn btn-primary" onClick={() => { addSchema({ name: 'NewSchema', properties: [] }); }}>+ New Schema</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SchemaEditor({ schema, onUpdate, onDelete }: { schema: SchemaComponent; onUpdate: (c: Partial<SchemaComponent>) => void; onDelete: () => void }) {
  const spec = useApiSpecStore((s) => s.spec);
  const usedInEndpoints = spec.endpoints.filter((ep) => {
    if (ep.requestBody?.mode === 'ref' && ep.requestBody.ref === schema.name) return true;
    if (ep.responses.some((r) => r.mode === 'ref' && r.ref === schema.name)) return true;
    return false;
  });

  const [showJsonInput, setShowJsonInput] = useState(false);
  const [rawJson, setRawJson] = useState('');

  const handleGenerateFromJson = () => {
    if (!rawJson.trim()) return;
    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        toast.error('Root JSON must be an object');
        return;
      }
      
      const newProps = jsonToProperties(parsed);
      onUpdate({ properties: [...schema.properties, ...newProps] });
      setShowJsonInput(false);
      setRawJson('');
      toast.success('Added properties from JSON');
    } catch (e) {
      toast.error('Invalid JSON format');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.2s ease' }}>
      {/* Schema info */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-purple)' }}>◈ Schema Component</div>
          <button className="btn btn-danger btn-sm" onClick={() => { onDelete(); toast.success('Schema deleted'); }}>Delete</button>
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="label">Schema Name *</label>
            <input className="input input-mono" value={schema.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="UserSchema" />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: 8 }}>
          <label className="label">Description</label>
          <input className="input" value={schema.description || ''} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Schema description" />
        </div>
        <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--bg-overlay)', borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--accent-blue)' }}>
          $ref: #/components/schemas/{schema.name}
        </div>
        
        {usedInEndpoints.length > 0 && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Used in Endpoints:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {usedInEndpoints.map(ep => (
                <div key={ep.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span className={`method-badge badge-${ep.method.toLowerCase()}`} style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }}>{ep.method}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{ep.path}</span>
                  {ep.summary && <span style={{ color: 'var(--text-muted)' }}>({ep.summary})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Properties */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Properties</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-sm ${showJsonInput ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setShowJsonInput(!showJsonInput)}>Generate from JSON</button>
          </div>
        </div>

        {showJsonInput && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-overlay)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Paste a JSON object below. Its nested structure and types will be automatically extracted.</div>
            <JsonEditor 
              value={rawJson} 
              onChange={setRawJson} 
              placeholder='{\n  "data": {\n    "id": 123\n  }\n}' 
              minHeight={120} 
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowJsonInput(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleGenerateFromJson}>Extract Parameters</button>
            </div>
          </div>
        )}

        <SchemaBuilder properties={schema.properties} onChange={p => onUpdate({ properties: p })} />
      </div>
    </div>
  );
}
