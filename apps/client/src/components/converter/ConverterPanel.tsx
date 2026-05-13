import { useState, useCallback } from 'react';
import { useUiStore } from '../../store/useUiStore';
import MonacoEditor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { convertJsonToOpenApi3, convertJsonToSwagger2, convertSpecToJson, detectFormat } from '@modern-api-studio/utils';
import type { ConvertJsonToSwaggerRequest, OpenApiVersion, OutputFormat } from '@modern-api-studio/types';

const SAMPLE_JSON = `{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "country": "US"
  },
  "tags": ["admin", "user"]
}`;

const SAMPLE_OPENAPI = `openapi: 3.0.3
info:
  title: Sample API
  version: 1.0.0
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
          example: 1
        name:
          type: string
          example: John Doe
        email:
          type: string
          format: email
          example: john@example.com
      required:
        - id
        - name
        - email`;

export function ConverterPanel() {
  const { converterDirection, setConverterDirection } = useUiStore();
  const [input, setInput] = useState(converterDirection === 'json-to-swagger' ? SAMPLE_JSON : SAMPLE_OPENAPI);
  const [output, setOutput] = useState('');
  const [targetVersion, setTargetVersion] = useState<OpenApiVersion>('openapi3');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('yaml');
  const [baseUrl, setBaseUrl] = useState('https://api.example.com');
  const [basePath, setBasePath] = useState('/api/v1/items');
  const [apiTitle, setApiTitle] = useState('Generated API');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = useCallback(() => {
    if (!input.trim()) { toast.error('Please provide input'); return; }
    setIsLoading(true);
    setError(null);

    try {
      let result = '';
      if (converterDirection === 'json-to-swagger') {
        const req: ConvertJsonToSwaggerRequest = {
          json: input, targetVersion, outputFormat, baseUrl, basePath, title: apiTitle, version: '1.0.0',
        };
        result = targetVersion === 'openapi3' ? convertJsonToOpenApi3(req) : convertJsonToSwagger2(req);
      } else {
        result = convertSpecToJson(input);
      }
      setOutput(result);
      toast.success('Conversion successful!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [input, converterDirection, targetVersion, outputFormat, baseUrl, basePath, apiTitle]);

  const handleSwapDirection = () => {
    const newDir = converterDirection === 'json-to-swagger' ? 'swagger-to-json' : 'json-to-swagger';
    setConverterDirection(newDir);
    setInput(newDir === 'json-to-swagger' ? SAMPLE_JSON : SAMPLE_OPENAPI);
    setOutput('');
    setError(null);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard!');
  };

  const handleDownload = () => {
    if (!output) return;
    const ext = converterDirection === 'json-to-swagger' ? (outputFormat === 'yaml' ? 'yaml' : 'json') : 'json';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `converted.${ext}`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as .${ext}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setInput(ev.target?.result as string || ''); };
    reader.readAsText(file);
  };

  const inputLang = converterDirection === 'json-to-swagger' ? 'json' : (detectFormat(input) === 'json' ? 'json' : 'yaml');
  const outputLang = converterDirection === 'json-to-swagger' ? (outputFormat === 'yaml' ? 'yaml' : 'json') : 'json';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        {/* Direction toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-overlay)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: converterDirection === 'json-to-swagger' ? 'var(--accent-green)' : 'var(--text-muted)' }}>JSON</span>
          <button onClick={handleSwapDirection} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--accent-blue)', padding: '0 4px' }}>⇄</button>
          <span style={{ fontSize: 12, fontWeight: 600, color: converterDirection === 'swagger-to-json' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>OpenAPI</span>
        </div>

        {converterDirection === 'json-to-swagger' && (
          <>
            <select className="input" style={{ width: 140 }} value={targetVersion} onChange={(e) => setTargetVersion(e.target.value as OpenApiVersion)}>
              <option value="openapi3">OpenAPI 3.0</option>
              <option value="swagger2">Swagger 2.0</option>
            </select>
            <select className="input" style={{ width: 90 }} value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}>
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
            </select>
            <input className="input input-mono" style={{ width: 200 }} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL" />
            <input className="input input-mono" style={{ width: 160 }} value={basePath} onChange={(e) => setBasePath(e.target.value)} placeholder="/api/v1/resource" />
            <input className="input" style={{ width: 140 }} value={apiTitle} onChange={(e) => setApiTitle(e.target.value)} placeholder="API Title" />
          </>
        )}

        <button className="btn btn-primary" onClick={handleConvert} disabled={isLoading} style={{ marginLeft: 'auto' }}>
          {isLoading ? '⟳ Converting...' : '⇄ Convert'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '8px 16px', background: 'rgba(243,139,168,0.1)', border: '0 0 1px 0', borderBottom: '1px solid rgba(243,139,168,0.3)', color: 'var(--accent-red)', fontSize: 12 }}>
          ✕ {error}
        </div>
      )}

      {/* Split editors */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
          <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {converterDirection === 'json-to-swagger' ? '📥 Input JSON' : '📥 Input OpenAPI/Swagger'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Drag & drop a file here</span>
          </div>
          <div style={{ flex: 1 }} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
            <MonacoEditor height="100%" language={inputLang} value={input} theme="vs-dark"
              onChange={(v) => setInput(v || '')}
              options={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2 }} />
          </div>
        </div>

        {/* Output */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {converterDirection === 'json-to-swagger' ? '📤 Output OpenAPI' : '📤 Output JSON'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={handleCopy} disabled={!output}>⎘ Copy</button>
              <button className="btn btn-ghost btn-sm" onClick={handleDownload} disabled={!output}>↓ Download</button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {output ? (
              <MonacoEditor height="100%" language={outputLang} value={output} theme="vs-dark"
                options={{ readOnly: true, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48 }}>⇄</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Click Convert to generate output</div>
                <div style={{ fontSize: 12 }}>Paste your {converterDirection === 'json-to-swagger' ? 'JSON' : 'OpenAPI spec'} on the left and hit Convert</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
