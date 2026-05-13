import type { Endpoint, SchemaProperty, SchemaType, ContentType, RequestBodyDefinition } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { jsonToSchema } from '@modern-api-studio/utils';

interface Props { endpoint: Endpoint; update: (c: Partial<Endpoint>) => void; }

const SCHEMA_TYPES: SchemaType[] = ['string', 'number', 'integer', 'boolean', 'object', 'array'];
const CONTENT_TYPES: ContentType[] = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'];

export function RequestBodyEditor({ endpoint, update }: Props) {
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
  const body = endpoint.requestBody;
  const mode = body?.mode || 'visual';

  const setBody = (b: Partial<RequestBodyDefinition>) => {
    update({ requestBody: { required: true, contentType: 'application/json', schema: [], ...body, ...b } });
  };

  const addField = () => {
    const newProp: SchemaProperty = { id: uuidv4(), name: '', type: 'string', required: false, nullable: false };
    setBody({ schema: [...(body?.schema || []), newProp] });
  };

  const updateField = (id: string, changes: Partial<SchemaProperty>) => {
    setBody({ schema: (body?.schema || []).map((f) => f.id === id ? { ...f, ...changes } : f) });
  };

  const removeField = (id: string) => {
    setBody({ schema: (body?.schema || []).filter((f) => f.id !== id) });
  };

  // legacy handleImportJson removed

  if (!hasBody) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 24, border: '1px dashed var(--border)', borderRadius: 8 }}>
        {endpoint.method} requests don't have a request body.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Content type */}
      <div className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="label">Content Type</label>
          <select className="input" value={body?.contentType || 'application/json'} onChange={(e) => setBody({ contentType: e.target.value as ContentType })}>
            {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="label">Description</label>
          <input className="input" value={body?.description || ''} onChange={(e) => setBody({ description: e.target.value })} placeholder="Request body description" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
          <label className="toggle"><input type="checkbox" checked={body?.required ?? true} onChange={(e) => setBody({ required: e.target.checked })} /><span className="toggle-slider" /></label>
          <span className="label" style={{ margin: 0 }}>Required</span>
        </div>
      </div>

      {/* Fields or Raw JSON */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Schema Definition</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-overlay)', padding: 4, borderRadius: 6 }}>
            <button className={`btn btn-sm ${mode === 'visual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setBody({ mode: 'visual' })}>Visual Builder</button>
            <button className={`btn btn-sm ${mode === 'raw' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setBody({ mode: 'raw' })}>Raw JSON</button>
          </div>
        </div>

        {mode === 'raw' ? (
          <div style={{ marginTop: 10 }}>
            <textarea className="input input-mono" style={{ minHeight: 150, fontSize: 12, marginBottom: 8 }} 
              value={body?.rawJson || ''} 
              onChange={(e) => setBody({ rawJson: e.target.value })} 
              placeholder='{\n  "id": 1,\n  "name": "Item"\n}' />
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              This JSON structure will be automatically parsed to generate the OpenAPI schema.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={addField}>+ Add Field</button>
            </div>
            {(body?.schema || []).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 16 }}>No fields. Click "+ Add Field" to begin.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 60px 60px 32px', gap: 6, padding: '0 4px', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>Name</span><span>Type</span><span>Format</span><span>Required</span><span>Nullable</span><span></span>
                </div>
                {(body?.schema || []).map((f) => (
                  <FieldRow key={f.id} field={f} onUpdate={(c) => updateField(f.id, c)} onRemove={() => removeField(f.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FieldRow({ field, onUpdate, onRemove }: { field: SchemaProperty; onUpdate: (c: Partial<SchemaProperty>) => void; onRemove: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 60px 60px 32px', gap: 6, alignItems: 'center', padding: '6px 4px', borderRadius: 6, background: 'var(--bg-overlay)' }}>
      <input className="input input-mono" style={{ fontSize: 11 }} value={field.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="field_name" />
      <select className="input" style={{ fontSize: 11 }} value={field.type} onChange={(e) => onUpdate({ type: e.target.value as SchemaType })}>
        {['string', 'number', 'integer', 'boolean', 'object', 'array'].map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input className="input" style={{ fontSize: 11 }} value={field.format || ''} onChange={(e) => onUpdate({ format: e.target.value })} placeholder="uuid..." />
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <label className="toggle" style={{ transform: 'scale(0.8)' }}>
          <input type="checkbox" checked={field.required} onChange={(e) => onUpdate({ required: e.target.checked })} />
          <span className="toggle-slider" />
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <label className="toggle" style={{ transform: 'scale(0.8)' }}>
          <input type="checkbox" checked={field.nullable} onChange={(e) => onUpdate({ nullable: e.target.checked })} />
          <span className="toggle-slider" />
        </label>
      </div>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={onRemove} style={{ color: 'var(--accent-red)', padding: 4 }}>✕</button>
    </div>
  );
}
