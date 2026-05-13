import { useState, useEffect, useRef } from 'react';
import { useUiStore } from '../../store/useUiStore';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import type { Endpoint } from '@modern-api-studio/types';
import MonacoEditor from '@monaco-editor/react';

interface Props {
  endpoint: Endpoint;
  mockBodyStr: string;
}

export function TestRunner({ endpoint, mockBodyStr }: Props) {
  const { testActiveServer, testAuthToken, setTestAuthToken, endpointTestUrls, setEndpointTestUrl } = useUiStore();
  const { spec } = useApiSpecStore();
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'response'>('params');
  const prevSrvNameRef = useRef(testActiveServer || (spec.servers.length > 0 ? spec.servers[0].name : ''));
  
  // State for dynamic fields
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = useState(mockBodyStr);
  
  // Execution state
  const [isTesting, setIsTesting] = useState(false);
  const [requestUrl, setRequestUrl] = useState('');
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
    
    // Initialize or load saved URL for this specific endpoint
    if (endpointTestUrls[endpoint.id]) {
      // Clean up any old {{VAR}} templates just in case
      let cachedUrl = endpointTestUrls[endpoint.id];
      spec.servers.forEach(srv => {
        if (srv.name && srv.url) {
          cachedUrl = cachedUrl.replace(new RegExp(`\\{\\{${srv.name}\\}\\}`, 'g'), srv.url.replace(/\/$/, ''));
        }
      });
      setRequestUrl(cachedUrl);
    } else {
      const activeSrvName = testActiveServer || (spec.servers.length > 0 ? spec.servers[0].name : '');
      const activeServer = spec.servers.find(s => s.name === activeSrvName);
      const defaultPrefix = (activeServer?.url || '').replace(/\/$/, '');
      const initialUrl = `${defaultPrefix}${endpoint.path}`;
      setRequestUrl(initialUrl);
      setEndpointTestUrl(endpoint.id, initialUrl);
    }
    
    setResponse(null);
    setActiveTab('params');
    prevSrvNameRef.current = testActiveServer || (spec.servers.length > 0 ? spec.servers[0].name : '');
  }, [endpoint.id, endpoint.parameters, endpoint.method, endpoint.path, mockBodyStr, spec.servers]);

  // Update requestUrl prefix immediately when active server changes
  useEffect(() => {
    const currentSrvName = testActiveServer || (spec.servers.length > 0 ? spec.servers[0].name : '');
    const prevSrvName = prevSrvNameRef.current;

    if (currentSrvName !== prevSrvName) {
      const oldServer = spec.servers.find(s => s.name === prevSrvName);
      const newServer = spec.servers.find(s => s.name === currentSrvName);
      const oldPrefix = (oldServer?.url || '').replace(/\/$/, '');
      const newPrefix = (newServer?.url || '').replace(/\/$/, '');

      if (oldPrefix && requestUrl.startsWith(oldPrefix)) {
        const updated = requestUrl.replace(oldPrefix, newPrefix);
        setRequestUrl(updated);
        setEndpointTestUrl(endpoint.id, updated);
      } else {
        const updated = `${newPrefix}${endpoint.path}`;
        setRequestUrl(updated);
        setEndpointTestUrl(endpoint.id, updated);
      }
      prevSrvNameRef.current = currentSrvName;
    }
  }, [testActiveServer, spec.servers, requestUrl, endpoint.path, endpoint.id, setEndpointTestUrl]);

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
  const authLabel = endpoint.security && endpoint.security.length > 0 ? `Auth Token (${endpoint.security.join(', ')})` : 'Auth Token';

  const handleSend = async () => {
    setIsTesting(true);
    setResponse(null);
    setActiveTab('response'); // auto switch to response tab

    try {
      // 1. Build URL
      let urlStr = requestUrl;
      
      // Substitute {{VARIABLE}} from spec.servers
      spec.servers.forEach(srv => {
        if (srv.name && srv.url) {
          urlStr = urlStr.replace(new RegExp(`\\{\\{${srv.name}\\}\\}`, 'g'), srv.url.replace(/\/$/, ''));
        }
      });

      // replace path params
      Object.entries(pathParams).forEach(([k, v]) => {
        if (v) urlStr = urlStr.replace(`{${k}}`, encodeURIComponent(v));
      });
      // append query params
      const q = new URLSearchParams();
      Object.entries(queryParams).forEach(([k, v]) => {
        if (v) q.append(k, v);
      });
      
      // Handle query-based API Key
      if (testAuthToken && endpoint.security && endpoint.security.length > 0) {
        const secName = endpoint.security[0];
        const scheme = spec.components.securitySchemes.find(s => s.name === secName);
        if (scheme?.type === 'apiKey' && scheme.in === 'query' && scheme.keyName) {
          q.append(scheme.keyName, testAuthToken);
        }
      }

      const qStr = q.toString();
      if (qStr) urlStr += `?${qStr}`;

      // 2. Build Headers
      const reqHeaders = new Headers();
      Object.entries(headers).forEach(([k, v]) => {
        if (v) reqHeaders.append(k, v);
      });
      
      if (testAuthToken && endpoint.security && endpoint.security.length > 0) {
        const secName = endpoint.security[0];
        const scheme = spec.components.securitySchemes.find(s => s.name === secName);
        
        if (scheme) {
          if (scheme.type === 'bearer') {
            const tokenVal = testAuthToken.replace(/^Bearer\s+/i, '');
            reqHeaders.append('Authorization', `Bearer ${tokenVal}`);
          } else if (scheme.type === 'basic') {
            const tokenVal = testAuthToken.replace(/^Basic\s+/i, '');
            reqHeaders.append('Authorization', `Basic ${tokenVal}`);
          } else if (scheme.type === 'apiKey' && scheme.in === 'header' && scheme.keyName) {
            reqHeaders.append(scheme.keyName, testAuthToken);
          } else if (scheme.type !== 'apiKey' || scheme.in !== 'query') {
            // Fallback for other header/cookie auth
            reqHeaders.append('Authorization', testAuthToken);
          }
        }
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
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="label" style={{ color: 'var(--accent-blue)' }}>Endpoint URL</label>
          <div style={{ display: 'flex', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-surface)', overflow: 'hidden', alignItems: 'center' }}>
            <div style={{ padding: '0 12px', fontWeight: 600, color: 'var(--accent-blue)', borderRight: '1px solid var(--border)' }}>{endpoint.method}</div>
            <input className="input input-mono" value={requestUrl} onChange={e => {
              setRequestUrl(e.target.value);
              setEndpointTestUrl(endpoint.id, e.target.value);
            }} placeholder="https://api.example.com/api/v1/resource" style={{ border: 'none', background: 'transparent', flex: 1, paddingLeft: 12 }} />
          </div>
        </div>
        {endpoint.security && endpoint.security.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="label" style={{ color: 'var(--accent-purple)' }}>{authLabel}</label>
            <textarea className="input input-mono" value={testAuthToken} onChange={e => setTestAuthToken(e.target.value)} placeholder="Token value..." style={{ minHeight: 60, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
          </div>
        )}
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
              Note: <strong>Authorization</strong> and <strong>Content-Type</strong> are injected automatically based on the Environment above and the JSON body.
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
