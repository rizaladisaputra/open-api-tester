import { useState, useEffect } from 'react';
import { useUiStore } from '../../store/useUiStore';
import type { Endpoint } from '@modern-api-studio/types';
import MonacoEditor from '@monaco-editor/react';

interface Props {
  endpoint: Endpoint;
  mockBodyStr: string;
}

export function TestRunner({ endpoint, mockBodyStr }: Props) {
  const { testBaseUrl, setTestBaseUrl, testAuthToken, setTestAuthToken } = useUiStore();
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'response'>('params');
  
  // State for dynamic fields
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = useState(mockBodyStr);
  
  // Execution state
  const [isTesting, setIsTesting] = useState(false);
  const [response, setResponse] = useState<{ status: number; statusText: string; time: number; size: number; data: string } | null>(null);

  // Initialize params when endpoint changes
  useEffect(() => {
    const newPathParams: Record<string, string> = {};
    const newQueryParams: Record<string, string> = {};
    const newHeaders: Record<string, string> = {};
    
    endpoint.parameters.forEach(p => {
      if (p.in === 'path') newPathParams[p.name] = p.schema?.example ? String(p.schema.example) : '';
      if (p.in === 'query') newQueryParams[p.name] = p.schema?.example ? String(p.schema.example) : '';
      if (p.in === 'header') newHeaders[p.name] = p.schema?.example ? String(p.schema.example) : '';
    });
    
    setPathParams(newPathParams);
    setQueryParams(newQueryParams);
    setHeaders(newHeaders);
    setRequestBody(mockBodyStr);
    setResponse(null);
    setActiveTab('params');
  }, [endpoint, mockBodyStr]);

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);

  const handleSend = async () => {
    setIsTesting(true);
    setResponse(null);
    setActiveTab('response'); // auto switch to response tab

    try {
      // 1. Build URL
      let urlStr = testBaseUrl.replace(/\/$/, '') + endpoint.path;
      // replace path params
      Object.entries(pathParams).forEach(([k, v]) => {
        if (v) urlStr = urlStr.replace(`{${k}}`, encodeURIComponent(v));
      });
      // append query params
      const q = new URLSearchParams();
      Object.entries(queryParams).forEach(([k, v]) => {
        if (v) q.append(k, v);
      });
      const qStr = q.toString();
      if (qStr) urlStr += `?${qStr}`;

      // 2. Build Headers
      const reqHeaders = new Headers();
      Object.entries(headers).forEach(([k, v]) => {
        if (v) reqHeaders.append(k, v);
      });
      if (testAuthToken) {
        reqHeaders.append('Authorization', testAuthToken);
      }
      if (hasBody && !reqHeaders.has('Content-Type')) {
        reqHeaders.append('Content-Type', 'application/json');
      }

      // 3. Execution
      const startTime = performance.now();
      const res = await fetch(urlStr, {
        method: endpoint.method,
        headers: reqHeaders,
        body: hasBody ? requestBody : undefined,
      });
      const endTime = performance.now();

      const text = await res.text();
      const sizeBytes = new Blob([text]).size;

      let formattedData = text;
      try {
        formattedData = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // keep as text
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: Math.round(endTime - startTime),
        size: sizeBytes,
        data: formattedData,
      });

    } catch (err: any) {
      setResponse({
        status: 0,
        statusText: 'Network Error / CORS',
        time: 0,
        size: 0,
        data: String(err.message || err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const pathKeys = Object.keys(pathParams);
  const queryKeys = Object.keys(queryParams);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Environment Settings */}
      <div style={{ background: 'var(--bg-overlay)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label className="label" style={{ color: 'var(--accent-blue)' }}>Server Environment URL</label>
            <input className="input input-mono" value={testBaseUrl} onChange={e => setTestBaseUrl(e.target.value)} placeholder="http://localhost:3000" />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="label" style={{ color: 'var(--accent-purple)' }}>Auth Token (Bearer)</label>
            <input className="input input-mono" type="password" value={testAuthToken} onChange={e => setTestAuthToken(e.target.value)} placeholder="eyJ..." />
          </div>
        </div>
      </div>

      {/* Runner Interface */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        <div className="tabs" style={{ padding: '0 12px' }}>
          <button className={`tab ${activeTab === 'params' ? 'active' : ''}`} onClick={() => setActiveTab('params')}>Params</button>
          <button className={`tab ${activeTab === 'headers' ? 'active' : ''}`} onClick={() => setActiveTab('headers')}>Headers</button>
          {hasBody && <button className={`tab ${activeTab === 'body' ? 'active' : ''}`} onClick={() => setActiveTab('body')}>Body</button>}
          <button className={`tab ${activeTab === 'response' ? 'active' : ''}`} onClick={() => setActiveTab('response')}>Response</button>
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', marginBottom: 8, marginRight: 12, padding: '4px 20px', fontSize: 13 }} onClick={handleSend} disabled={isTesting}>
          {isTesting ? 'Sending...' : '▶ Send'}
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '0 12px 12px' }}>
        {activeTab === 'params' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pathKeys.length === 0 && queryKeys.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', paddingTop: 8 }}>No path or query parameters for this endpoint.</div>
            )}
            {pathKeys.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 8 }}>Path Variables</div>
                {pathKeys.map(k => (
                  <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, padding: '6px 8px', background: 'var(--bg-overlay)', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-teal)' }}>{k}</div>
                    <input className="input input-mono" style={{ flex: 2, padding: '6px 8px', fontSize: 12 }} value={pathParams[k]} onChange={e => setPathParams({...pathParams, [k]: e.target.value})} placeholder="value" />
                  </div>
                ))}
              </div>
            )}
            {queryKeys.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 8 }}>Query Parameters</div>
                {queryKeys.map(k => (
                  <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, padding: '6px 8px', background: 'var(--bg-overlay)', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-blue)' }}>{k}</div>
                    <input className="input input-mono" style={{ flex: 2, padding: '6px 8px', fontSize: 12 }} value={queryParams[k]} onChange={e => setQueryParams({...queryParams, [k]: e.target.value})} placeholder="value" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div style={{ paddingTop: 8 }}>
            {Object.keys(headers).length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>No custom header parameters defined.</div>
            ) : (
              Object.keys(headers).map(k => (
                <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1, padding: '6px 8px', background: 'var(--bg-overlay)', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-purple)' }}>{k}</div>
                  <input className="input input-mono" style={{ flex: 2, padding: '6px 8px', fontSize: 12 }} value={headers[k]} onChange={e => setHeaders({...headers, [k]: e.target.value})} placeholder="value" />
                </div>
              ))
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              Note: <strong>Authorization (Bearer)</strong> and <strong>Content-Type</strong> are injected automatically based on the Environment above and the JSON body.
            </div>
          </div>
        )}

        {activeTab === 'body' && hasBody && (
          <div style={{ height: 200, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
            <MonacoEditor
              height="100%"
              language="json"
              value={requestBody}
              onChange={val => setRequestBody(val || '')}
              theme="vs-dark"
              options={{ minimap: { enabled: false }, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>
        )}

        {activeTab === 'response' && (
          <div style={{ paddingTop: 8 }}>
            {!response ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 24 }}>Send the request to see the response.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Meta stats */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 600, padding: '8px 12px', background: 'var(--bg-overlay)', borderRadius: 6 }}>
                  <div style={{ color: response.status >= 200 && response.status < 300 ? 'var(--accent-green)' : response.status === 0 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
                    Status: {response.status === 0 ? 'ERR' : response.status} {response.statusText}
                  </div>
                  <div style={{ width: 1, background: 'var(--border)' }}></div>
                  <div style={{ color: 'var(--text-secondary)' }}>Time: <span style={{ color: 'var(--accent-teal)' }}>{response.time} ms</span></div>
                  <div style={{ width: 1, background: 'var(--border)' }}></div>
                  <div style={{ color: 'var(--text-secondary)' }}>Size: <span style={{ color: 'var(--accent-blue)' }}>{(response.size / 1024).toFixed(2)} KB</span></div>
                </div>
                {/* Body */}
                <div style={{ height: 300, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <MonacoEditor
                    height="100%"
                    language="json"
                    value={response.data}
                    theme="vs-dark"
                    options={{ minimap: { enabled: false }, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', readOnly: true }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
