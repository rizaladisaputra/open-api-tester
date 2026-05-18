import { useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { parseOpenApiToSpec } from '../lib/yamlImporter';
import { useApiSpecStore } from '../store/useApiSpecStore';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { ApiSpec } from '@modern-api-studio/types';

interface ImportYamlModalProps {
  onClose: () => void;
  /** Called after a project is successfully created & imported */
  onImported: () => void;
}

type Step = 'upload' | 'preview' | 'saving';

export function ImportYamlModal({ onClose, onImported }: ImportYamlModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [rawText, setRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedSpec, setParsedSpec] = useState<ApiSpec | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File helpers ────────────────────────────────────────────────────────────

  const loadFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setRawText(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  // ── Parse & preview ─────────────────────────────────────────────────────────

  const handleParse = () => {
    if (!rawText.trim()) { toast.error('Paste YAML/JSON or drop a file first'); return; }
    try {
      const { spec, warnings } = parseOpenApiToSpec(rawText);
      setParsedSpec(spec);
      setWarnings(warnings);
      setProjectName(spec.info.title || 'Imported API');
      setStep('preview');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // ── Save to Supabase ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!parsedSpec) return;
    if (!projectName.trim()) { toast.error('Enter a project name'); return; }

    setStep('saving');

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const finalSpec: ApiSpec = {
        ...parsedSpec,
        id: uuidv4(),
        info: { ...parsedSpec.info, title: projectName.trim() },
      };

      const { error } = await supabase
        .from('projects')
        .insert({
          user_id: userData.user.id,
          name: projectName.trim(),
          spec_data: finalSpec,
        });

      if (error) throw new Error(error.message);

      // Load the newly created project into the store
      const { data: projectRow } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('name', projectName.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (projectRow) {
        const { loadProjectFromSupabase } = useApiSpecStore.getState();
        await loadProjectFromSupabase(projectRow.id, 'owner');
      }

      toast.success(`"${projectName.trim()}" imported successfully!`);
      onImported();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
      setStep('preview');
    }
  };

  // ── Styles ───────────────────────────────────────────────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeIn 0.15s ease',
  };

  const modalStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    width: 620,
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    animation: 'slideUp 0.2s ease',
  };

  const headerStyle: React.CSSProperties = {
    padding: '18px 24px',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'linear-gradient(135deg, rgba(137,180,250,0.08), rgba(203,166,247,0.08))',
  };

  const dropZoneStyle: React.CSSProperties = {
    border: `2px dashed ${isDragging ? 'var(--accent-blue)' : 'var(--border)'}`,
    borderRadius: 12,
    padding: '32px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    background: isDragging ? 'rgba(137,180,250,0.06)' : 'var(--bg-overlay)',
    transition: 'all 0.2s ease',
  };

  // ─── Upload Step ─────────────────────────────────────────────────────────────

  const renderUpload = () => (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
      {/* Drop zone */}
      <div
        style={dropZoneStyle}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {fileName ? `✅ ${fileName}` : 'Drag & drop your OpenAPI file here'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Supports .yaml, .yml, .json — OpenAPI 3.x &amp; Swagger 2.x
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml,.json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Paste area */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          Or paste YAML / JSON directly:
        </label>
        <textarea
          value={rawText}
          onChange={(e) => { setRawText(e.target.value); setFileName(null); }}
          placeholder={`openapi: 3.0.3\ninfo:\n  title: My API\n  version: 1.0.0\npaths:\n  /users:\n    get:\n      summary: List users\n      responses:\n        '200':\n          description: OK`}
          style={{
            width: '100%', minHeight: 200, resize: 'vertical',
            fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 12,
            background: 'var(--bg-overlay)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)',
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleParse} disabled={!rawText.trim()}>
          Parse &amp; Preview →
        </button>
      </div>
    </div>
  );

  // ─── Preview Step ─────────────────────────────────────────────────────────────

  const renderPreview = () => {
    if (!parsedSpec) return null;
    const { info, endpoints, tags, components } = parsedSpec;

    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Warnings */}
        {warnings.length > 0 && (
          <div style={{
            background: 'rgba(249,226,175,0.1)', border: '1px solid rgba(249,226,175,0.3)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-yellow)', marginBottom: 4 }}>⚠ Warnings</div>
            {warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--accent-yellow)', opacity: 0.85 }}>• {w}</div>
            ))}
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Endpoints', value: endpoints.length, icon: '⚡' },
            { label: 'Tags', value: tags.length, icon: '🏷' },
            { label: 'Schemas', value: components.schemas.length, icon: '📦' },
            { label: 'Auth', value: components.securitySchemes.length, icon: '🔐' },
          ].map((item) => (
            <div key={item.label} style={{
              background: 'var(--bg-overlay)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* API Info */}
        <div style={{ background: 'var(--bg-overlay)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>API Info</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{info.title}</div>
          {info.description && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{info.description.slice(0, 150)}{info.description.length > 150 ? '…' : ''}</div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Version {info.version} · {parsedSpec.openApiVersion === 'swagger2' ? 'Swagger 2.0' : 'OpenAPI 3.x'}</div>
        </div>

        {/* Endpoint preview list */}
        {endpoints.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Endpoints preview (first 8)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {endpoints.slice(0, 8).map((ep) => (
                <div key={ep.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-overlay)', borderRadius: 6, padding: '6px 10px',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: methodColor(ep.method) + '22', color: methodColor(ep.method),
                    minWidth: 50, textAlign: 'center',
                  }}>
                    {ep.method}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{ep.path}</span>
                  {ep.summary && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{ep.summary.slice(0, 40)}</span>}
                </div>
              ))}
              {endpoints.length > 8 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 10px' }}>
                  + {endpoints.length - 8} more endpoints
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project name */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Project name
          </label>
          <input
            className="input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name..."
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setStep('upload')}>← Back</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!projectName.trim()}
          >
            ✓ Import as Project
          </button>
        </div>
      </div>
    );
  };

  // ─── Saving step ─────────────────────────────────────────────────────────────

  const renderSaving = () => (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 36, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
      <div style={{ fontSize: 14 }}>Saving project…</div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
            }}>
              📥
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Import OpenAPI Spec</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {step === 'upload' ? 'YAML / JSON — OpenAPI 3.x or Swagger 2.x'
                  : step === 'preview' ? 'Review parsed result before importing'
                  : 'Saving…'}
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(['upload', 'preview'] as Step[]).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <div style={{ width: 20, height: 1, background: 'var(--border)' }} />}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step === s ? 'var(--accent-blue)' : (step === 'saving' || ['upload', 'preview'].indexOf(step) > i) ? 'var(--accent-green)' : 'var(--bg-overlay)',
                  color: (step === s || step === 'saving') ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s',
                }}>
                  {i + 1}
                </div>
              </div>
            ))}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, marginLeft: 8, lineHeight: 1 }}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        {step === 'upload' && renderUpload()}
        {step === 'preview' && renderPreview()}
        {step === 'saving' && renderSaving()}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function methodColor(method: string): string {
  const map: Record<string, string> = {
    GET: '#89b4fa', POST: '#a6e3a1', PUT: '#fab387',
    PATCH: '#f9e2af', DELETE: '#f38ba8',
    OPTIONS: '#cba6f7', HEAD: '#89dceb', TRACE: '#b4befe',
  };
  return map[method.toUpperCase()] ?? '#cdd6f4';
}
