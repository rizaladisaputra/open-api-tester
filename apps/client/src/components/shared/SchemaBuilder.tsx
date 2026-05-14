import { useState } from 'react';
import type { SchemaProperty, SchemaType } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  properties: SchemaProperty[];
  onChange: (props: SchemaProperty[]) => void;
  level?: number;
}

export function SchemaBuilder({ properties, onChange, level = 0 }: Props) {
  const updateProp = (id: string, changes: Partial<SchemaProperty>) => {
    onChange(properties.map((p) => p.id === id ? { ...p, ...changes } : p));
  };

  const removeProp = (id: string) => {
    onChange(properties.filter((p) => p.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {level === 0 && properties.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 40px 40px 32px', gap: 6, padding: '0 4px', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <span>Name</span><span>Type</span><span>Format</span><span title="Required">Req</span><span title="Nullable">Null</span><span></span>
        </div>
      )}
      {properties.map((p) => (
        <FieldRow key={p.id} field={p} level={level} onUpdate={(c) => updateProp(p.id, c)} onRemove={() => removeProp(p.id)} />
      ))}
      {properties.length === 0 && level === 0 && (
         <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 16 }}>No fields defined.</div>
      )}
    </div>
  );
}

function FieldRow({ field, level, onUpdate, onRemove }: { field: SchemaProperty; level: number; onUpdate: (c: Partial<SchemaProperty>) => void; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(true);
  
  const isObject = field.type === 'object';
  const isArray = field.type === 'array';
  
  const paddingLeft = 4 + (level * 16);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 40px 40px 32px', gap: 6, alignItems: 'center', padding: `5px 4px 5px ${paddingLeft}px`, borderRadius: 4, background: 'var(--bg-overlay)', border: '1px solid transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
           {(isObject || (isArray && field.items?.type === 'object')) ? (
             <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
               {expanded ? '▼' : '▶'}
             </button>
           ) : (
             <div style={{ width: 12 }} />
           )}
           <input className="input input-mono" style={{ fontSize: 11, flex: 1, padding: '4px 6px' }} value={field.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="field_name" />
        </div>
        <select className="input" style={{ fontSize: 11, padding: '4px 6px' }} value={field.type} onChange={(e) => {
             const t = e.target.value as SchemaType;
             const updates: Partial<SchemaProperty> = { type: t };
             if (t === 'object' && !field.properties) updates.properties = [];
             if (t === 'array' && !field.items) updates.items = { id: uuidv4(), name: 'items', type: 'string', required: false, nullable: false };
             onUpdate(updates);
           }}>
          {['string','number','integer','boolean','object','array'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className="input" style={{ fontSize: 11, padding: '4px 6px' }} value={field.format || ''} onChange={(e) => onUpdate({ format: e.target.value })} placeholder="format" />
        
        <label style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer' }} title="Required">
           <input type="checkbox" checked={field.required} onChange={e => onUpdate({ required: e.target.checked })} />
        </label>
        <label style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer' }} title="Nullable">
           <input type="checkbox" checked={field.nullable} onChange={e => onUpdate({ nullable: e.target.checked })} />
        </label>
        
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onRemove} style={{ color: 'var(--accent-red)', padding: 4 }}>✕</button>
      </div>

      {isArray && field.items && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `4px 4px 4px ${paddingLeft + 30}px` }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Array of:</span>
          <select className="input" style={{ fontSize: 11, width: 90, padding: '2px 6px' }} value={field.items.type} onChange={(e) => {
             const t = e.target.value as SchemaType;
             const newItems = { ...field.items!, type: t };
             if (t === 'object' && !newItems.properties) newItems.properties = [];
             onUpdate({ items: newItems });
          }}>
             {['string','number','integer','boolean','object'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {expanded && isObject && field.properties && (
        <div style={{ borderLeft: '1px solid var(--border)', marginLeft: paddingLeft + 5, paddingBottom: 6 }}>
          <SchemaBuilder properties={field.properties} onChange={(p) => onUpdate({ properties: p })} level={level + 1} />
          <div style={{ padding: `4px 4px 4px 16px` }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px', color: 'var(--accent-blue)' }} onClick={() => {
              const p: SchemaProperty = { id: uuidv4(), name: '', type: 'string', required: false, nullable: false };
              onUpdate({ properties: [...field.properties!, p] });
            }}>+ Add Property to {field.name}</button>
          </div>
        </div>
      )}

      {expanded && isArray && field.items?.type === 'object' && field.items.properties && (
        <div style={{ borderLeft: '1px solid var(--border)', marginLeft: paddingLeft + 5, paddingBottom: 6 }}>
          <SchemaBuilder properties={field.items.properties} onChange={(p) => onUpdate({ items: { ...field.items!, properties: p } })} level={level + 1} />
          <div style={{ padding: `4px 4px 4px 16px` }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px', color: 'var(--accent-blue)' }} onClick={() => {
              const p: SchemaProperty = { id: uuidv4(), name: '', type: 'string', required: false, nullable: false };
              onUpdate({ items: { ...field.items!, properties: [...field.items!.properties!, p] } });
            }}>+ Add Property to items</button>
          </div>
        </div>
      )}
    </div>
  );
}
