import { useApiSpecStore } from '../../store/useApiSpecStore';
import { useUiStore } from '../../store/useUiStore';
import { EndpointDetail } from './EndpointDetail';
// ApiInfoForm moved to home tab
import { apiSpecToOpenApi3, yaml } from '@modern-api-studio/utils';
import MonacoEditor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export function DesignerPanel() {
  const { spec, activeEndpointId } = useApiSpecStore();
  const { editorMode, setEditorMode } = useUiStore();
  const activeEndpoint = spec.endpoints.find((e) => e.id === activeEndpointId);
  const [liveView, setLiveView] = useState<'code' | 'swagger'>('code');

  const yamlOutput = apiSpecToOpenApi3(spec, 'yaml');
  const jsonOutput = apiSpecToOpenApi3(spec, 'json');

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: Visual editor */}
      <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          <div className="tabs">
            <button className={`tab ${editorMode === 'visual' ? 'active' : ''}`} onClick={() => setEditorMode('visual')}>Visual</button>
            <button className={`tab ${editorMode === 'yaml' ? 'active' : ''}`} onClick={() => setEditorMode('yaml')}>YAML</button>
            <button className={`tab ${editorMode === 'json' ? 'active' : ''}`} onClick={() => setEditorMode('json')}>JSON</button>
          </div>
          {activeEndpoint && editorMode === 'visual' && (
            <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`method-badge badge-${activeEndpoint.method.toLowerCase()}`}>{activeEndpoint.method}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{activeEndpoint.path}</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {editorMode === 'visual' ? (
            <div className="scroll-y" style={{ height: '100%', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!activeEndpoint ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 48, opacity: 0.5 }}>✦</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>No Endpoint Selected</div>
                  <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 300 }}>Select an endpoint from the sidebar or click "+ Add Endpoint" to start designing.</div>
                </div>
              ) : (
                <EndpointDetail endpoint={activeEndpoint} />
              )}
            </div>
          ) : (
            <MonacoEditor
              height="100%"
              language={editorMode === 'yaml' ? 'yaml' : 'json'}
              value={editorMode === 'yaml' ? yamlOutput : jsonOutput}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                readOnly: true,
                tabSize: 2,
              }}
            />
          )}
        </div>
      </div>

      {/* Right: Live Output */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button className={`tab ${liveView === 'code' ? 'active' : ''}`} onClick={() => setLiveView('code')}>Code Output</button>
            <button className={`tab ${liveView === 'swagger' ? 'active' : ''}`} onClick={() => setLiveView('swagger')}>Swagger Preview</button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {liveView === 'code' && (
              <>
                <CopyButton text={yamlOutput} label="YAML" />
                <CopyButton text={jsonOutput} label="JSON" />
              </>
            )}
          </div>
        </div>
        
        {liveView === 'code' ? (
          <MonacoEditor
            height="100%"
            language="yaml"
            value={yamlOutput}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: 'JetBrains Mono, monospace',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
            }}
          />
        ) : (
          <div className="scroll-y" style={{ height: '100%', background: '#fff' }}>
            <SwaggerUI spec={JSON.parse(jsonOutput)} />
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };
  return (
    <button className="btn btn-ghost btn-sm" onClick={handleCopy}>⎘ {label}</button>
  );
}
