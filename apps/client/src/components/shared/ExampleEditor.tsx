import { useState } from 'react';
import type { EndpointExample } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';
import { JsonEditor } from './JsonEditor';

interface Props {
  examples: EndpointExample[];
  onChange: (examples: EndpointExample[]) => void;
  onGenerateFromSchema?: () => void;
}

export function ExampleEditor({ examples = [], onChange, onGenerateFromSchema }: Props) {
  const [activeTab, setActiveTab] = useState<string | null>(examples.length > 0 ? examples[0].id : null);

  const addExample = () => {
    const newEx: EndpointExample = {
      id: uuidv4(),
      name: `example_${examples.length + 1}`,
      summary: '',
      value: '{\n  \n}'
    };
    const newExamples = [...examples, newEx];
    onChange(newExamples);
    setActiveTab(newEx.id);
  };

  const removeExample = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExamples = examples.filter((ex) => ex.id !== id);
    onChange(newExamples);
    if (activeTab === id) {
      setActiveTab(newExamples.length > 0 ? newExamples[0].id : null);
    }
  };

  const updateExample = (id: string, changes: Partial<EndpointExample>) => {
    onChange(examples.map((ex) => ex.id === id ? { ...ex, ...changes } : ex));
  };

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Multiple Examples</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onGenerateFromSchema && (
            <button className="btn btn-ghost btn-sm" onClick={onGenerateFromSchema}>🪄 Generate from Schema</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={addExample}>+ Add Example</button>
        </div>
      </div>

      {examples.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 16 }}>
          No examples defined. Click "+ Add Example" to simulate payloads.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-overlay)', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
            {examples.map((ex) => (
              <div 
                key={ex.id} 
                onClick={() => setActiveTab(ex.id)}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  borderBottom: activeTab === ex.id ? '2px solid var(--accent-purple)' : '2px solid transparent',
                  background: activeTab === ex.id ? 'var(--bg-surface)' : 'transparent',
                  color: activeTab === ex.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap'
                }}
              >
                {ex.name || 'Unnamed'}
                <button 
                  onClick={(e) => removeExample(ex.id, e)} 
                  style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 10, padding: '2px 4px', borderRadius: 4 }}
                  className="hover-bg"
                >✕</button>
              </div>
            ))}
          </div>

          {/* Active Content */}
          {activeTab && (
            <div style={{ padding: 12, background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Example Name (Key)</label>
                  <input 
                    className="input input-mono" 
                    style={{ fontSize: 12 }} 
                    value={examples.find(e => e.id === activeTab)?.name || ''} 
                    onChange={(e) => updateExample(activeTab, { name: e.target.value.replace(/\s+/g, '_') })} 
                    placeholder="Success_200" 
                  />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="label">Summary (Optional)</label>
                  <input 
                    className="input" 
                    style={{ fontSize: 12 }} 
                    value={examples.find(e => e.id === activeTab)?.summary || ''} 
                    onChange={(e) => updateExample(activeTab, { summary: e.target.value })} 
                    placeholder="Brief description of this example" 
                  />
                </div>
              </div>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Payload Value (JSON)</label>
                <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                  <JsonEditor 
                    value={examples.find(e => e.id === activeTab)?.value || ''} 
                    onChange={(v) => updateExample(activeTab, { value: v })} 
                    placeholder='{\n  "key": "value"\n}'
                    minHeight={150}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
