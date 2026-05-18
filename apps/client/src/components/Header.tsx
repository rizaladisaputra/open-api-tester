import { useCallback, useEffect, useState } from 'react';
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

// ─── "Last saved X ago" helper ────────────────────────────────────────────────
function useTimeAgo(isoTs: string | null): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!isoTs) { setLabel(''); return; }

    const update = () => {
      const diff = Math.floor((Date.now() - new Date(isoTs).getTime()) / 1000);
      if (diff < 10)  setLabel('just now');
      else if (diff < 60) setLabel(`${diff}s ago`);
      else if (diff < 3600) setLabel(`${Math.floor(diff / 60)}m ago`);
      else setLabel(`${Math.floor(diff / 3600)}h ago`);
    };

    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [isoTs]);

  return label;
}

// ─── Conflict dialog ───────────────────────────────────────────────────────────
function ConflictDialog({
  changedBy,
  onOverwrite,
  onReload,
  onDismiss,
}: {
  changedBy: string;
  onOverwrite: () => void;
  onReload: () => void;
  onDismiss: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.15s ease',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid rgba(243,139,168,0.4)',
        borderRadius: 14, padding: 28, width: 440, maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.2s ease',
      }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Save Conflict Detected
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
          <strong style={{ color: 'var(--accent-red)' }}>{changedBy}</strong> saved this project
          after you last loaded it. Your changes and theirs now conflict.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <button
            className="btn btn-ghost"
            onClick={onReload}
            style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, height: 'auto', padding: '12px 14px' }}
          >
            <span style={{ fontWeight: 600, fontSize: 13 }}>🔄 Reload theirs</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Discard your local edits</span>
          </button>
          <button
            className="btn btn-danger"
            onClick={onOverwrite}
            style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, height: 'auto', padding: '12px 14px' }}
          >
            <span style={{ fontWeight: 600, fontSize: 13 }}>💾 Overwrite</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>Force-save your edits</span>
          </button>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onDismiss}
          style={{ width: '100%', fontSize: 12 }}
        >
          Cancel (keep editing without saving)
        </button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(16px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

export function Header({ onBackToDashboard }: { onBackToDashboard?: () => void }) {
  const {
    spec, undo, redo, historyIndex, history,
    activeProjectId, currentUserRole,
    saveProjectToSupabase, loadProjectFromSupabase,
    localUpdatedAt, lastSavedAt,
  } = useApiSpecStore();
  const { activePanel, setActivePanel } = useUiStore();
  const {
    hasRemoteChange, remoteChangedBy, clearRemoteChange,
    saveLockOwner,
    broadcastSaveLock, broadcastSaveUnlock,
  } = useCollabStore();

  const [saving, setSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [conflictMeta, setConflictMeta] = useState<{ changedBy: string; serverTs: string } | null>(null);

  const timeAgo = useTimeAgo(lastSavedAt);
  const isViewer = currentUserRole === 'viewer';

  // Is someone else holding the save lock?
  const lockedByOther = saveLockOwner !== null;

  // ── Main save flow ──────────────────────────────────────────────────────────
  const executeSave = useCallback(async (forceOverwrite = false) => {
    if (!activeProjectId || isViewer) return;

    // Broadcast lock so other collaborators know we're saving
    const { data: userData } = await (await import('../lib/supabase')).supabase.auth.getUser();
    const email = userData.user?.email ?? 'Someone';
    broadcastSaveLock(email);

    setSaving(true);
    try {
      if (forceOverwrite) {
        // Skip conflict check: align localUpdatedAt to server before saving
        const { supabase } = await import('../lib/supabase');
        const { data: cur } = await supabase
          .from('projects')
          .select('updated_at')
          .eq('id', activeProjectId)
          .single();
        useApiSpecStore.setState({ localUpdatedAt: (cur as any)?.updated_at ?? null });
      }

      await saveProjectToSupabase();
      toast.success('✅ Project saved');
      setConflictMeta(null);
    } catch (err: any) {
      if (err?.message === 'SAVE_CONFLICT') {
        // Surface conflict dialog instead of auto-overwriting
        setConflictMeta({
          changedBy: remoteChangedBy ?? 'Another collaborator',
          serverTs: err.serverUpdatedAt ?? '',
        });
      } else {
        toast.error(`Save failed: ${err?.message ?? 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
      broadcastSaveUnlock();
    }
  }, [activeProjectId, isViewer, saveProjectToSupabase, remoteChangedBy, broadcastSaveLock, broadcastSaveUnlock]);

  const handleSave = () => executeSave(false);

  const handleConflictOverwrite = () => executeSave(true);

  const handleConflictReload = async () => {
    if (!activeProjectId) return;
    await loadProjectFromSupabase(activeProjectId, currentUserRole ?? 'viewer');
    clearRemoteChange();
    setConflictMeta(null);
    toast.success('🔄 Reloaded latest version');
  };

  const handleReloadRemote = async () => {
    if (!activeProjectId) return;
    await loadProjectFromSupabase(activeProjectId, currentUserRole ?? 'viewer');
    clearRemoteChange();
    toast.success('Spec reloaded');
  };

  const handleExportYaml = () => {
    const yamlStr = apiSpecToOpenApi3(spec, 'yaml');
    downloadFile(yamlStr, `${spec.info.title.replace(/\s+/g, '-').toLowerCase()}-openapi.yaml`, 'text/yaml');
    toast.success('Exported as YAML');
  };

  const handleExportJson = () => {
    const json = apiSpecToOpenApi3(spec, 'json');
    downloadFile(json, `${spec.info.title.replace(/\s+/g, '-').toLowerCase()}-openapi.json`, 'application/json');
    toast.success('Exported as JSON');
  };

  // Keyboard shortcut: Ctrl+S / Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !isViewer && activeProjectId) {
        e.preventDefault();
        if (!saving && !lockedByOther) handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, lockedByOther, isViewer, activeProjectId, handleSave]);

  // Save button tooltip
  const saveTooltip = lockedByOther
    ? `🔒 ${saveLockOwner} is saving…`
    : saving
    ? 'Saving…'
    : `Save to cloud${lastSavedAt ? ` · last saved ${timeAgo}` : ''} (Ctrl+S)`;

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

      {/* Save-lock banner — shown to collaborators while someone else is saving */}
      {lockedByOther && !saving && (
        <div style={{
          background: 'rgba(137,180,250,0.08)', borderBottom: '1px solid rgba(137,180,250,0.2)',
          padding: '5px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'var(--accent-blue)' }}>
            ⏳ <strong>{saveLockOwner}</strong> is saving… Save is temporarily locked.
          </span>
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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className={`btn btn-sm ${lockedByOther ? 'btn-ghost' : 'btn-ghost'}`}
                onClick={handleSave}
                disabled={saving || lockedByOther}
                data-tooltip={saveTooltip}
                style={{
                  opacity: lockedByOther ? 0.45 : 1,
                  transition: 'opacity 0.2s',
                  position: 'relative',
                }}
              >
                {saving
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                      Saving…
                    </span>
                  : lockedByOther
                  ? '🔒 Locked'
                  : '☁ Save'}
              </button>

              {/* Last saved indicator */}
              {lastSavedAt && !saving && !lockedByOther && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {timeAgo}
                </span>
              )}
            </div>
          )}

          <button className="btn btn-primary btn-sm" onClick={() => setActivePanel('preview')}>▶ Preview</button>
        </div>
      </header>

      {/* Share modal */}
      {showShare && activeProjectId && (
        <ShareModal projectId={activeProjectId} onClose={() => setShowShare(false)} />
      )}

      {/* Conflict dialog */}
      {conflictMeta && (
        <ConflictDialog
          changedBy={conflictMeta.changedBy}
          onOverwrite={handleConflictOverwrite}
          onReload={handleConflictReload}
          onDismiss={() => setConflictMeta(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
