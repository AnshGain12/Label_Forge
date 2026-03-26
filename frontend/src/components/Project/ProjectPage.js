import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Project.css';

const CLASS_COLORS = [
  '#FF6B6B','#6C63FF','#00E5FF','#FF6B9D','#00E676',
  '#FFD93D','#FF8E53','#A8FF78','#78FFD6','#FF9FF3',
  '#54A0FF','#FF9F43','#1DD1A1','#EE5A24','#9C88FF'
];

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('images');
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', color: CLASS_COLORS[0] });
  const [editingProject, setEditingProject] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [annotations, setAnnotations] = useState([]);
  const fileRef = useRef();

  useEffect(() => { fetchProject(); fetchStats(); }, [id]);

  const fetchProject = async () => {
    try {
      const res = await axios.get(`/api/projects/${id}`);
      setProject(res.data);
      setEditForm({ name: res.data.name, description: res.data.description || '' });
    } catch { toast.error('Project not found'); navigate('/'); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const [statsRes, annRes] = await Promise.all([
        axios.get(`/api/export/${id}/stats`),
        axios.get(`/api/annotations/${id}`)
      ]);
      setStats(statsRes.data);
      setAnnotations(annRes.data);
    } catch {}
  };

  const uploadImages = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const form = new FormData();
    Array.from(files).forEach(f => form.append('images', f));
    try {
      const res = await axios.post(`/api/projects/${id}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProject(res.data);
      toast.success(`${files.length} image(s) uploaded`);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const deleteImage = async (imageId) => {
    try {
      const res = await axios.delete(`/api/projects/${id}/images/${imageId}`);
      setProject(res.data);
      fetchStats();
      toast.success('Image removed');
    } catch { toast.error('Failed to remove image'); }
  };

  const addClass = async () => {
    if (!newClass.name.trim()) return;
    const classes = [...(project.classes || []), {
      id: project.classes.length,
      name: newClass.name.trim(),
      color: newClass.color
    }];
    try {
      const res = await axios.put(`/api/projects/${id}`, { classes });
      setProject(res.data);
      setNewClass({ name: '', color: CLASS_COLORS[classes.length % CLASS_COLORS.length] });
      setShowClassModal(false);
      toast.success('Class added');
    } catch { toast.error('Failed to add class'); }
  };

  const deleteClass = async (classId) => {
    const classes = project.classes.filter(c => c.id !== classId).map((c, i) => ({ ...c, id: i }));
    try {
      const res = await axios.put(`/api/projects/${id}`, { classes });
      setProject(res.data);
      toast.success('Class removed');
    } catch { toast.error('Failed to remove class'); }
  };

  const saveProjectEdit = async () => {
    try {
      const res = await axios.put(`/api/projects/${id}`, editForm);
      setProject(res.data);
      setEditingProject(false);
      toast.success('Project updated');
    } catch { toast.error('Failed to update project'); }
  };

  const exportCSV = async () => {
  try {
    const token = localStorage.getItem('token'); // or from your auth context

    const res = await axios.get(
      `http://localhost:5000/api/export/${id}/csv`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error(err);
    toast.error('Failed to download CSV');
  }
};

const exportClasses = async () => {
  try {
    const token = localStorage.getItem('token');

    const res = await axios.get(
      `http://localhost:5000/api/export/${id}/classes`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      }
    );

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classes.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error(err);
    toast.error('Failed to download classes');
  }
};
  const getAnnotationCount = (imageId) => {
    const ann = annotations.find(a => String(a.imageId) === String(imageId));
    return ann ? ann.boxes.length : 0;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    uploadImages(e.dataTransfer.files);
  };

  if (loading) return (
    <div className="flex-center" style={{ height: '100vh' }}>
      <div className="spin" style={{ width: 36, height: 36, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div className="project-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Dashboard
          </button>
          <span className="nav-sep">›</span>
          <span className="nav-project-name">{project?.name}</span>
        </div>
        <div className="navbar-right">
          <button className="btn btn-secondary btn-sm" onClick={exportClasses}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            classes.txt
          </button>
          <button className="btn btn-success btn-sm" onClick={exportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            annotations.csv
          </button>
        </div>
      </nav>

      <div className="project-body">
        {/* Project header */}
        <div className="project-header fade-in">
          {editingProject ? (
            <div className="project-edit-form">
              <input className="input" style={{ fontSize: 24, fontWeight: 700 }} value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              <input className="input" style={{ fontSize: 14 }} placeholder="Description..."
                value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
              <div className="flex gap-2 mt-2">
                <button className="btn btn-primary btn-sm" onClick={saveProjectEdit}>Save</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingProject(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="project-title-area">
              <h1 className="project-title">{project.name}</h1>
              {project.description && <p className="project-subtitle">{project.description}</p>}
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingProject(true)} style={{ marginTop: 8 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
            </div>
          )}

          {stats && (
            <div className="project-stats">
              {[
                { v: stats.totalImages, l: 'Images' },
                { v: stats.annotatedImages, l: 'Annotated' },
                { v: stats.totalBoxes, l: 'Boxes' },
                { v: stats.totalClasses, l: 'Classes' },
              ].map(s => (
                <div key={s.l} className="proj-stat">
                  <div className="proj-stat-val">{s.v}</div>
                  <div className="proj-stat-lbl">{s.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs fade-in">
          {['images', 'classes'].map(t => (
            <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
              {t === 'images' ? `Images (${project.images?.length || 0})` : `Classes (${project.classes?.length || 0})`}
            </button>
          ))}
        </div>

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="tab-content fade-in">
            {/* Upload zone */}
            <div
              className={`upload-zone ${uploading ? 'uploading' : ''}`}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => !uploading && fileRef.current.click()}
            >
              <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
                onChange={e => uploadImages(e.target.files)} />
              {uploading ? (
                <>
                  <div className="spin" style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%' }} />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span>Drop images here or click to upload</span>
                  <span className="upload-sub">JPEG, PNG, WebP — up to 20MB each</span>
                </>
              )}
            </div>

            {/* Image grid */}
            {project.images?.length > 0 ? (
              <div className="images-grid">
                {project.images.map(img => {
                  const boxCount = getAnnotationCount(img._id);
                  return (
                    <div key={img._id} className="image-tile">
                      <div className="image-thumb" onClick={() => navigate(`/project/${id}/annotate/${img._id}`)}>
                        <img src={`http://localhost:5000${img.path}`} alt={img.originalName} loading="lazy" />
                        <div className="image-overlay">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
                          <span>Annotate</span>
                        </div>
                        {boxCount > 0 && (
                          <div className="image-badge">{boxCount}</div>
                        )}
                      </div>
                      <div className="image-info">
                        <span className="image-name" title={img.originalName}>{img.originalName}</span>
                        <button className="btn-icon-sm" onClick={() => deleteImage(img._id)} title="Remove">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="tab-empty">
                <p>No images yet. Upload some to start annotating.</p>
              </div>
            )}
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="tab-content fade-in">
            <div className="classes-header">
              <p className="classes-hint">Define object classes before annotating. Each class gets a unique ID (0–n).</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowClassModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Class
              </button>
            </div>

            {project.classes?.length > 0 ? (
              <div className="classes-list">
                {project.classes.map(c => (
                  <div key={c.id} className="class-row">
                    <div className="class-id mono">#{c.id}</div>
                    <div className="class-swatch" style={{ background: c.color }} />
                    <div className="class-name">{c.name}</div>
                    <button className="btn-icon-sm" onClick={() => deleteClass(c.id)} title="Remove class">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tab-empty">
                <p>No classes defined. Add classes to start annotating objects.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowClassModal(true)}>Add First Class</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      {showClassModal && (
        <div className="modal-overlay" onClick={() => setShowClassModal(false)}>
          <div className="modal modal-sm fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Class</h2>
              <button className="btn-close" onClick={() => setShowClassModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="label">Class Name</label>
                <input className="input" placeholder="e.g. car, person, dog" value={newClass.name}
                  onChange={e => setNewClass(c => ({ ...c, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addClass()}
                  autoFocus />
              </div>
              <div className="form-group">
                <label className="label">Color</label>
                <div className="color-grid">
                  {CLASS_COLORS.map(col => (
                    <div key={col}
                      className={`color-dot ${newClass.color === col ? 'selected' : ''}`}
                      style={{ background: col }}
                      onClick={() => setNewClass(c => ({ ...c, color: col }))}
                    />
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowClassModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={addClass} disabled={!newClass.name.trim()}>Add Class</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
