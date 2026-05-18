import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import { apiSpecToOpenApi3 } from '@modern-api-studio/utils';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function JsonEditor({ value, onChange, placeholder, minHeight = 150 }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef<any>(null);
  
  // Get live spec for Swagger UI in fullscreen mode
  const spec = useApiSpecStore(s => s.spec);
  // generate the OpenAPI JSON spec and parse it so SwaggerUI can render it directly
  let swaggerSpecJson = {};
  if (isFullscreen) {
    try {
      swaggerSpecJson = JSON.parse(apiSpecToOpenApi3(spec, 'json'));
    } catch (e) {
      // fallback if error
    }
  }

  // Configure Monaco to treat this as standard JSON but IGNORE comment errors
  const handleBeforeMount = (monaco: any) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true, // This allows JSONC comments without red squiggles!
      trailingCommas: 'ignore',
    });
  };

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleBeautify = () => {
    if (!value.trim()) return;
    try {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.formatDocument').run();
        toast.success('JSON Beautified');
      }
    } catch {
      toast.error('Could not format JSON');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isFullscreen) {
      setIsFullscreen(false);
    }
  };

  const containerStyle: React.CSSProperties = isFullscreen ? {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'var(--bg-surface)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    padding: 24
  } : {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: minHeight,
    border: '1px solid var(--border)',
    borderRadius: 6,
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle} onKeyDown={handleKeyDown}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 0, background: 'var(--bg-overlay)', padding: '4px 8px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>💡 JSONC Supported (// comments)</span>
        
        {isFullscreen && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-blue)' }}>JSON Editor & Swagger UI Preview</span>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11, color: 'var(--text-muted)' }} onClick={handleBeautify}>✨ Beautify</button>
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11, color: 'var(--text-muted)' }} onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? '⤓ Exit Fullscreen' : '⤢ Fullscreen'}
          </button>
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: isFullscreen ? 16 : 0, paddingTop: isFullscreen ? 16 : 0 }}>
        {/* Left/Main: JSON Editor */}
        <div style={{ flex: 1, minHeight: 0, border: isFullscreen ? '1px solid var(--border)' : 'none', borderRadius: isFullscreen ? 6 : 0, overflow: 'hidden' }}>
          {isFullscreen && (
            <div style={{ padding: '4px 12px', background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
              📝 Edit JSON Payload
            </div>
          )}
          <MonacoEditor
            height={isFullscreen ? "calc(100% - 25px)" : "100%"}
            language="json"
            value={value}
            theme="vs-dark"
            beforeMount={handleBeforeMount}
            onMount={handleMount}
            onChange={(v) => onChange(v ?? '')}
            options={{
              fontSize: 13,
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              lineNumbers: 'on',
              folding: true,
              formatOnPaste: true,
            }}
          />
        </div>

        {/* Right: Swagger Preview (Only in Fullscreen) */}
        {isFullscreen && (
          <div style={{ flex: 1, minHeight: 0, border: '1px solid var(--border)', borderRadius: 6, overflow: 'auto', background: 'white' }}>
            <div style={{ padding: '4px 12px', background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
              👁 Live Swagger UI
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
              <SwaggerUI spec={swaggerSpecJson} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
