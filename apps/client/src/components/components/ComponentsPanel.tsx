import { useState } from 'react';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import type { SchemaComponent, SchemaProperty, SchemaType } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

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
  const addProp = () => {
    const p: SchemaProperty = { id: uuidv4(), name: '', type: 'string', required: false, nullable: false };
    onUpdate({ properties: [...schema.properties, p] });
  };

  const updateProp = (id: string, changes: Partial<SchemaProperty>) => {
    onUpdate({ properties: schema.properties.map((p) => p.id === id ? { ...p, ...changes } : p) });
  };

  const removeProp = (id: string) => {
    onUpdate({ properties: schema.properties.filter((p) => p.id !== id) });
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
      </div>

      {/* Properties */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Properties ({schema.properties.length})</div>
          <button className="btn btn-ghost btn-sm" onClick={addProp}>+ Add Property</button>
        </div>

        {schema.properties.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 20 }}>No properties. Click "+ Add Property" to begin.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schema.properties.map((p) => (
              <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 10px', background: 'var(--bg-overlay)', borderRadius: 8 }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 6 }}>
                  <div className="form-group">
                    <label className="label">Name</label>
                    <input className="input input-mono" style={{ fontSize: 12 }} value={p.name} onChange={(e) => updateProp(p.id, { name: e.target.value })} placeholder="propertyName" />
                  </div>
                  <div className="form-group">
                    <label className="label">Type</label>
                    <select className="input" style={{ fontSize: 12 }} value={p.type} onChange={(e) => updateProp(p.id, { type: e.target.value as SchemaType })}>
                      {['string','number','integer','boolean','object','array'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Format</label>
                    <input className="input" style={{ fontSize: 12 }} value={p.format || ''} onChange={(e) => updateProp(p.id, { format: e.target.value })} placeholder="uuid, date..." />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', paddingTop: 20 }}>
                  <label style={{ display: 'flex', gap: 4, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', alignItems: 'center' }}>
                    <input type="checkbox" checked={p.required} onChange={(e) => updateProp(p.id, { required: e.target.checked })} />req
                  </label>
                  <label style={{ display: 'flex', gap: 4, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', alignItems: 'center' }}>
                    <input type="checkbox" checked={p.nullable} onChange={(e) => updateProp(p.id, { nullable: e.target.checked })} />null
                  </label>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeProp(p.id)} style={{ color: 'var(--accent-red)', paddingTop: 22 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
