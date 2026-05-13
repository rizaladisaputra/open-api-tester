import { useApiSpecStore } from '../store/useApiSpecStore';
import { useUiStore } from '../store/useUiStore';
import { apiSpecToOpenApi3, detectFormat } from '@modern-api-studio/utils';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { id: 'home',       label: 'Home',        icon: '🏠' },
  { id: 'designer',   label: 'Designer',    icon: '✦' },
  { id: 'converter',  label: 'Converter',   icon: '⇄' },
  { id: 'components', label: 'Schemas',     icon: '◈' },
  { id: 'security',   label: 'Security',    icon: '🔒' },
  { id: 'preview',    label: 'Preview',     icon: '◉' },
] as const;

export function Header() {
  const { spec, undo, redo, historyIndex, history } = useApiSpecStore();
  const { activePanel, setActivePanel, toggleDarkMode } = useUiStore();

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
    <header style={{
      display: 'flex', alignItems: 'center', gap: 0,
      background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
      padding: '0 16px', height: '52px', flexShrink: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, boxShadow: '0 0 16px rgba(137,180,250,0.3)',
        }}>⚡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1 }}>API Studio</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>Modern OpenAPI Designer</div>
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
        <button className="btn btn-ghost btn-sm btn-icon" onClick={undo} disabled={historyIndex <= 0} data-tooltip="Undo">↩</button>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={redo} disabled={historyIndex >= history.length - 1} data-tooltip="Redo">↪</button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
        <button className="btn btn-ghost btn-sm" onClick={handleExportYaml}>↓ YAML</button>
        <button className="btn btn-ghost btn-sm" onClick={handleExportJson}>↓ JSON</button>
        <button className="btn btn-primary btn-sm" onClick={() => setActivePanel('preview')}>▶ Preview</button>
      </div>
    </header>
  );
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
