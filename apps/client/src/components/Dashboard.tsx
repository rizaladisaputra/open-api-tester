import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useApiSpecStore } from '../store/useApiSpecStore';
import toast from 'react-hot-toast';

export function Dashboard({ onProjectSelect }: { onProjectSelect: () => void }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadProjectFromSupabase, createNewProject } = useApiSpecStore();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, updated_at')
        .eq('user_id', userData.user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        toast.error('Failed to load projects');
      } else {
        setProjects(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    const name = window.prompt('Enter project name:', 'New API Project');
    if (!name) return;
    
    await createNewProject(name);
    onProjectSelect();
  };

  const handleSelect = async (id: string) => {
    await loadProjectFromSupabase(id);
    onProjectSelect();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, margin: 0, color: 'var(--text-primary)' }}>Your Projects</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
          <button className="btn btn-primary" onClick={handleCreate}>+ New Project</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 16 }}>No projects found</div>
          <button className="btn btn-primary" onClick={handleCreate}>Create your first API</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {projects.map(p => (
            <div key={p.id} className="card hover-bg" style={{ cursor: 'pointer', padding: 20 }} onClick={() => handleSelect(p.id)}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>{p.name}</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Updated {new Date(p.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
