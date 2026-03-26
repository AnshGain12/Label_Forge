import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      setProjects(res.data);
    } catch { toast.error('Failed to load projects'); }
    finally { setLoading(false); }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post('/api/projects', form);
      setProjects(p => [res.data, ...p]);
      setForm({ name: '', description: '' });
      setShowCreate(false);
      toast.success('Project created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally { setCreating(false); }
  };

  const deleteProject = async (id) => {
    try {
      await axios.delete(`/api/projects/${id}`);
      setProjects(p => p.filter(x => x._id !== id));
      setDeleteConfirm(null);
      toast.success('Project deleted');
    } catch { toast.error('Failed to delete project'); }
  };

  const stats = {
    total: projects.length,
    images: projects.reduce((s, p) => s + (p.images?.length || 0), 0),
    classes: projects.reduce((s, p) => s + (p.classes?.length || 0), 0),
  };

  return (
    <div className="dashboard-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <span className="nav-logo">⬡ LabelForge</span>
        </div>
        <div className="navbar-right">
          <span className="nav-user">
            <span className="nav-avatar">{user?.username?.[0]?.toUpperCase()}</span>
            {user?.username}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={logout}>Sign Out</button>
        </div>
      </nav>

      <div className="dashboard-body">
        {/* Header */}
        <div className="dashboard-header fade-in">
          <div>
            <h1 className="dashboard-title">Projects</h1>
            <p className="dashboard-sub">Manage your annotation projects</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </button>
        </div>

        {/* Stats */}
        <div className="stats-row fade-in">
          {[
            { label: 'Projects', value: stats.total, icon: '◈', color: 'var(--accent)' },
            { label: 'Total Images', value: stats.images, icon: '◉', color: 'var(--accent3)' },
            { label: 'Object Classes', value: stats.classes, icon: '◆', color: 'var(--accent2)' },
          ].map(s => (
            <div key={s.label} className="stat-card card">
              <span className="stat-icon" style={{ color: s.color }}>{s.icon}</span>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Projects grid */}
        {loading ? (
          <div className="flex-center" style={{ padding: '60px', color: 'var(--text2)' }}>
            <div className="spin" style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%' }} />
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state fade-in">
            <div className="empty-icon">⬡</div>
            <h3>No projects yet</h3>
            <p>Create your first annotation project to get started</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>
          </div>
        ) : (
          <div className="projects-grid fade-in">
            {projects.map(p => (
              <div key={p._id} className="project-card card" onClick={() => navigate(`/project/${p._id}`)}>
                <div className="project-card-header">
                  <div className="project-icon">
                    {p.name[0].toUpperCase()}
                  </div>
                  <button
                    className="btn btn-danger btn-sm project-delete"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p._id); }}
                    title="Delete project"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  </button>
                </div>
                <h3 className="project-name">{p.name}</h3>
                {p.description && <p className="project-desc">{p.description}</p>}
                <div className="project-meta">
                  <span className="badge badge-accent">{p.images?.length || 0} images</span>
                  <span className="badge badge-warning">{p.classes?.length || 0} classes</span>
                </div>
                <div className="project-date">
                  Updated {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="btn-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={createProject} className="modal-form">
              <div className="form-group">
                <label className="label">Project Name *</label>
                <input className="input" placeholder="My Annotation Project" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <textarea className="input" rows={3} placeholder="Optional description..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-sm fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Project?</h2>
              <button className="btn-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text2)', marginBottom: 20 }}>
              This will permanently delete the project, all images, and all annotations. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteProject(deleteConfirm)} style={{ background: 'var(--danger)', color: '#fff' }}>
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
