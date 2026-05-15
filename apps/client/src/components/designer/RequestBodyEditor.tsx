import type { Endpoint, SchemaProperty, SchemaType, ContentType, RequestBodyDefinition } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { buildSchemaFromProperties, generateMockFromSchema } from '@modern-api-studio/utils';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import { SchemaBuilder } from '../shared/SchemaBuilder';
import { JsonEditor } from '../shared/JsonEditor';
import { ExampleEditor } from '../shared/ExampleEditor';

interface Props { endpoint: Endpoint; update: (c: Partial<Endpoint>) => void; }

const SCHEMA_TYPES: SchemaType[] = ['string', 'number', 'integer', 'boolean', 'object', 'array'];
const CONTENT_TYPES: ContentType[] = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'];

export function RequestBodyEditor({ endpoint, update }: Props) {
  const spec = useApiSpecStore(s => s.spec);
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
  const body = endpoint.requestBody;
  const mode = body?.mode || 'visual';

  const setBody = (b: Partial<RequestBodyDefinition>) => {
    update({ requestBody: { required: true, contentType: 'application/json', schema: [], ...body, ...b } });
  };

  const handleGenerateExample = () => {
    if (!body?.schema || body.schema.length === 0) {
      toast.error('Define schema properties first to generate mock.');
      return;
    }
    try {
      const schemaObj = buildSchemaFromProperties(body.schema);
      const definitions: Record<string, unknown> = {};
      spec.components.schemas.forEach(comp => {
        definitions[comp.name] = buildSchemaFromProperties(comp.properties);
      });
      const mock = generateMockFromSchema(schemaObj, definitions);
      const newEx = {
        id: uuidv4(),
        name: `generated_${uuidv4().substring(0, 4)}`,
        summary: 'Auto-generated mock',
        value: JSON.stringify(mock, null, 2)
      };
      setBody({ examples: [...(body.examples || []), newEx] });
      toast.success('Example generated');
    } catch (e) {
      toast.error('Failed to generate mock');
    }
  };

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
            <button className={`btn btn-sm ${mode === 'ref' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setBody({ mode: 'ref' })}>Use Schema</button>
          </div>
        </div>

        {mode === 'ref' ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, marginBottom: 12, color: 'var(--text-secondary)' }}>Select a reusable schema from Components:</div>
            <select className="input" style={{ maxWidth: 300, margin: '0 auto', display: 'block' }} value={body?.ref || ''} onChange={e => setBody({ ref: e.target.value })}>
              <option value="">-- Select Schema --</option>
              {spec.components.schemas.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        ) : mode === 'raw' ? (
          <div style={{ marginTop: 10 }}>
            <JsonEditor 
              value={body?.rawJson || ''} 
              onChange={(v) => setBody({ rawJson: v })} 
              placeholder='{\n  "id": 1,\n  "name": "Item"\n}' 
              minHeight={150} 
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              This JSON structure will be automatically parsed to generate the OpenAPI schema.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <SchemaBuilder properties={body?.schema || []} onChange={p => setBody({ schema: p })} />
          </div>
        )}
      </div>

      {/* Multiple Examples */}
      <ExampleEditor 
        examples={body?.examples || []} 
        onChange={(ex) => setBody({ examples: ex })} 
        onGenerateFromSchema={body?.mode === 'visual' && body?.schema?.length > 0 ? handleGenerateExample : undefined}
      />
    </div>
  );
}
