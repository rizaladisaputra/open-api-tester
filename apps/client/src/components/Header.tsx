import { useState } from 'react';
import { useApiSpecStore } from '../store/useApiSpecStore';
import { useUiStore } from '../store/useUiStore';
import { useCollabStore } from '../store/useCollabStore';
import { apiSpecToOpenApi3 } from '@modern-api-studio/utils';
import { CollaboratorsBar } from './collab/CollaboratorsBar';
import { ShareModal } from './collab/ShareModal';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { id: 'home',       label: 'Home',        icon: '🏠' },
  { id: 'designer',   label: 'Designer',    icon: '✦' },
  { id: 'converter',  label: 'Converter',   icon: '⇄' },
  { id: 'components', label: 'Schemas',     icon: '◈' },
  { id: 'security',   label: 'Security',    icon: '🔒' },
  { id: 'preview',    label: 'Preview',     icon: '◉' },
] as const;

export function Header({ onBackToDashboard }: { onBackToDashboard?: () => void }) {
  const { spec, undo, redo, historyIndex, history, activeProjectId, currentUserRole, saveProjectToSupabase } = useApiSpecStore();
  const { activePanel, setActivePanel } = useUiStore();
  const { hasRemoteChange, remoteChangedBy, clearRemoteChange } = useCollabStore();
  const { loadProjectFromSupabase } = useApiSpecStore();

  const [saving, setSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const isViewer = currentUserRole === 'viewer';

  const handleSave = async () => {
    if (!activeProjectId || isViewer) return;
    setSaving(true);
    await saveProjectToSupabase();
    toast.success('Project saved');
    setSaving(false);
  };

  const handleReloadRemote = async () => {
    if (!activeProjectId) return;
    await loadProjectFromSupabase(activeProjectId, currentUserRole ?? 'viewer');
    clearRemoteChange();
    toast.success('Spec reloaded');
  };

  const handleExportYaml = () => {
    const yaml = apiSpecToOpenApi3(spec, 'yaml');
    downloadFile(yaml, `${spec.info.title.replace(/\s+/g, '-').toLowerCase()}-openapi.yaml`, 'text/yaml');
    toast.success('Exported as YAML');
  };

  const handleExportJson = () => {
    const json = apiSpecToOpenApi3(spec, 'json');
    downloadFile(json, `${spec.info.title.replace(/\s+/g, '-').toLowerCase()}-openapi.json`, 'application/json');
    toast.success('Exported as JSON');
  };

  return (
    <>
      {/* Remote-change banner */}
      {hasRemoteChange && (
        <div style={{
          background: 'rgba(249,226,175,0.12)', borderBottom: '1px solid rgba(249,226,175,0.3)',
          padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: 'var(--accent-yellow)', flex: 1 }}>
            ⚡ <strong>{remoteChangedBy}</strong> saved changes to this project
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleReloadRemote}>Reload</button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={clearRemoteChange} style={{ fontSize: 11 }}>✕</button>
        </div>
      )}

      <header style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        padding: '0 16px', height: '52px', flexShrink: 0, zIndex: 100,
      }}>
        {/* Logo / Back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24 }}>
          {onBackToDashboard && (
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={onBackToDashboard}
              data-tooltip="Back to Projects"
              style={{ fontSize: 16 }}
            >
              ←
            </button>
          )}
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 0 16px rgba(137,180,250,0.3)',
          }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1 }}>API Studio</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>
              {isViewer ? '👁 View only' : 'Modern OpenAPI Designer'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={`tab ${activePanel === item.id ? 'active' : ''}`}
              onClick={() => setActivePanel(item.id as typeof activePanel)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Collaborators bar */}
          {activeProjectId && (
            <CollaboratorsBar onShareClick={() => setShowShare(true)} />
          )}

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          <button className="btn btn-ghost btn-sm btn-icon" onClick={undo} disabled={historyIndex <= 0} data-tooltip="Undo">↩</button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={redo} disabled={historyIndex >= history.length - 1} data-tooltip="Redo">↪</button>

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          <button className="btn btn-ghost btn-sm" onClick={handleExportYaml}>↓ YAML</button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportJson}>↓ JSON</button>

          {activeProjectId && !isViewer && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleSave}
              disabled={saving}
              data-tooltip="Save to cloud"
            >
              {saving ? '…' : '☁ Save'}
            </button>
          )}

          <button className="btn btn-primary btn-sm" onClick={() => setActivePanel('preview')}>▶ Preview</button>
        </div>
      </header>

      {/* Share modal */}
      {showShare && activeProjectId && (
        <ShareModal projectId={activeProjectId} onClose={() => setShowShare(false)} />
      )}
    </>
  );
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
