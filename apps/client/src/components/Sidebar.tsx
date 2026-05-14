import { useState } from 'react';
import { useApiSpecStore } from '../store/useApiSpecStore';
import { useUiStore } from '../store/useUiStore';
import type { HttpMethod } from '@modern-api-studio/types';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'badge-get', POST: 'badge-post', PUT: 'badge-put', PATCH: 'badge-patch', DELETE: 'badge-delete',
};

export function Sidebar() {
  const { spec, activeEndpointId, setActiveEndpoint, addEndpoint, deleteEndpoint, searchQuery, setSearchQuery, filterTag, setFilterTag } = useApiSpecStore();
  const { sidebarCollapsed, toggleSidebar, setActivePanel } = useUiStore();
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set(['Users', 'Products', 'Authentication']));

  const filtered = spec.endpoints.filter((ep) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || ep.path.toLowerCase().includes(q) || ep.summary?.toLowerCase().includes(q) || ep.method.toLowerCase().includes(q);
    const matchTag = !filterTag || ep.tags.includes(filterTag);
    return matchSearch && matchTag;
  });

  // Group by tag
  const groups: Record<string, typeof filtered> = { Untagged: [] };
  for (const tag of spec.tags) groups[tag.name] = [];
  for (const ep of filtered) {
    if (ep.tags.length === 0) groups['Untagged'].push(ep);
    else ep.tags.forEach((t) => { if (groups[t]) groups[t].push(ep); else groups['Untagged'].push(ep); });
  }

  const toggleTag = (name: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  if (sidebarCollapsed) {
    return (
      <aside style={{ width: 40, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleSidebar} data-tooltip="Expand">»</button>
      </aside>
    );
  }

  return (
    <aside style={{ width: 260, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Sidebar header */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <input className="input" placeholder="Search endpoints..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, padding: '5px 10px', fontSize: 12 }} />
        <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleSidebar} data-tooltip="Collapse">«</button>
      </div>

      {/* Tag filter */}
      <div style={{ padding: '6px 12px', display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
        <button className={`btn btn-sm ${!filterTag ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setFilterTag(null)}>All</button>
        {spec.tags.map((t) => (
          <button key={t.id} className={`btn btn-sm ${filterTag === t.name ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setFilterTag(filterTag === t.name ? null : t.name)}>{t.name}</button>
        ))}
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 14, padding: '0 6px' }} onClick={() => {
          const name = window.prompt('Enter new tag name:');
          if (name) { useApiSpecStore.getState().addTag({ name }); setFilterTag(name); }
        }} title="Add Tag">+</button>
      </div>

      {/* Endpoint list */}
      <div className="scroll-y" style={{ flex: 1, padding: '8px 0' }}>
        {Object.entries(groups).filter(([, eps]) => eps.length > 0).map(([tag, eps]) => (
          <div key={tag} style={{ marginBottom: 4 }}>
            {/* Tag header */}
            <button onClick={() => toggleTag(tag)} style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 12px',
              background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'inherit',
              justifyContent: 'space-between',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--accent-purple)' }}>▸</span>
                {tag}
              </span>
              <span style={{ background: 'var(--bg-overlay)', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>{eps.length}</span>
            </button>

            {/* Endpoints */}
            {expandedTags.has(tag) && eps.map((ep) => (
              <div key={ep.id} onClick={() => { setActiveEndpoint(ep.id); setActivePanel('designer'); }}
                className={`sidebar-item ${activeEndpointId === ep.id ? 'active' : ''}`}
                style={{ paddingLeft: 20, gap: 8, display: 'flex', alignItems: 'center' }}>
                <span className={`method-badge badge-${ep.method.toLowerCase()}`}>{ep.method}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: ep.summary ? 'inherit' : 'JetBrains Mono, monospace', fontSize: 12, fontWeight: ep.summary ? 600 : 400 }}>
                  {ep.summary || ep.path}
                </span>
                {ep.security && ep.security.length > 0 && <span className="auth-badge">🔒</span>}
                {ep.deprecated && <span style={{ color: 'var(--accent-yellow)', fontSize: 10 }}>⚠</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer buttons */}
      <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6, flexDirection: 'column' }}>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
          onClick={() => addEndpoint()}>
          + Add Endpoint
        </button>
        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, color: 'var(--accent-red)' }}
          onClick={() => { if (window.confirm('Are you sure you want to delete ALL endpoints?')) useApiSpecStore.getState().clearEndpoints(); }}>
          ✕ Clear All
        </button>
      </div>
    </aside>
  );
}
