import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Annotation.css';

export default function AnnotationPage() {
  const { projectId, imageId } = useParams();
  const navigate = useNavigate();

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const [project, setProject] = useState(null);
  const [image, setImage] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [tool, setTool] = useState('draw'); // draw | select | pan
  const [saving, setSaving] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [allImages, setAllImages] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(-1);

  // Drawing state (refs to avoid stale closures in canvas events)
  const drawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const currentBox = useRef(null);
  const isDragging = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const stateRef = useRef({ boxes, selectedClass, selectedBox, tool, zoom, pan });

  useEffect(() => {
    stateRef.current = { boxes, selectedClass, selectedBox, tool, zoom, pan };
  }, [boxes, selectedClass, selectedBox, tool, zoom, pan]);

  useEffect(() => { fetchData(); }, [projectId, imageId]);

  const fetchData = async () => {
    try {
      const [projRes, annRes] = await Promise.all([
        axios.get(`/api/projects/${projectId}`),
        axios.get(`/api/annotations/${projectId}/${imageId}`)
      ]);
      const proj = projRes.data;
      setProject(proj);
      setAllImages(proj.images || []);
      const idx = proj.images.findIndex(i => String(i._id) === String(imageId));
      setCurrentIdx(idx);
      const img = proj.images[idx];
      setImage(img);
      setBoxes(annRes.data?.boxes || []);
      if (proj.classes?.length > 0) setSelectedClass(proj.classes[0]);
    } catch (err) {
      toast.error('Failed to load annotation data');
      navigate(`/project/${projectId}`);
    }
  };

  // Canvas draw
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    const { boxes, selectedBox, zoom, pan } = stateRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw image
    ctx.drawImage(imgRef.current, 0, 0);

    // Draw boxes
    boxes.forEach((box, i) => {
      const isSelected = selectedBox === i;
      ctx.strokeStyle = box.color || '#6C63FF';
      ctx.lineWidth = (isSelected ? 2.5 : 1.5) / zoom;
      ctx.fillStyle = isSelected
        ? `${box.color || '#6C63FF'}30`
        : `${box.color || '#6C63FF'}18`;

      ctx.beginPath();
      ctx.rect(box.x, box.y, box.w, box.h);
      ctx.fill();
      ctx.stroke();

      // Label
      const labelText = `${box.classId}: ${box.className}`;
      const fontSize = Math.max(10, 12 / zoom);
      ctx.font = `600 ${fontSize}px Syne, sans-serif`;
      const textW = ctx.measureText(labelText).width;
      const padX = 5 / zoom, padY = 3 / zoom;
      const labelH = fontSize + padY * 2;
      const labelY = box.y > labelH + 4 / zoom ? box.y - labelH - 2 / zoom : box.y + 2 / zoom;

      ctx.fillStyle = box.color || '#6C63FF';
      ctx.beginPath();
      ctx.rect(box.x, labelY, textW + padX * 2, labelH);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.fillText(labelText, box.x + padX, labelY + fontSize);
    });

    // Draw current (in-progress) box
    if (currentBox.current) {
      const cb = currentBox.current;
      ctx.strokeStyle = cb.color || '#6C63FF';
      ctx.lineWidth = 2 / zoom;
      ctx.fillStyle = `${cb.color || '#6C63FF'}20`;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.rect(cb.x, cb.y, cb.w, cb.h);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [imgLoaded]);

  useEffect(() => { redraw(); }, [boxes, selectedBox, zoom, pan, imgLoaded, redraw]);

  // Size the canvas once the canvas element is mounted (after imgLoaded=true)
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current) return;
    canvasRef.current.width = imgRef.current.naturalWidth;
    canvasRef.current.height = imgRef.current.naturalHeight;
    redraw();
  }, [imgLoaded]); // eslint-disable-line

  const setupCanvas = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return;
    const img = imgRef.current;
    if (!img.naturalWidth || !img.naturalHeight) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const cw = rect.width || container.offsetWidth || 800;
    const ch = rect.height || container.offsetHeight || 600;

    // Canvas internal resolution = image natural size
    // (canvasRef may not exist yet — it's conditional on imgLoaded)
    // So we set imgLoaded first, then size in a follow-up effect
    const initZoom = Math.min(cw / img.naturalWidth, ch / img.naturalHeight, 1.5);
    const initPanX = (cw - img.naturalWidth * initZoom) / 2;
    const initPanY = (ch - img.naturalHeight * initZoom) / 2;
    setZoom(initZoom);
    setPan({ x: Math.max(0, initPanX), y: Math.max(0, initPanY) });
    setImgLoaded(true);
  }, []);

  const canvasToImage = (cx, cy) => {
    const { zoom, pan } = stateRef.current;
    return { x: (cx - pan.x) / zoom, y: (cy - pan.y) / zoom };
  };

  const handleMouseDown = (e) => {
    const { tool, selectedClass } = stateRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const pos = canvasToImage(cx, cy);

    if (tool === 'pan' || e.button === 1) {
      isDragging.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      panOrigin.current = { ...stateRef.current.pan };
      return;
    }

    if (tool === 'select') {
      // Find clicked box
      const { boxes } = stateRef.current;
      let found = -1;
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
          found = i; break;
        }
      }
      setSelectedBox(found >= 0 ? found : null);
      return;
    }

    if (tool === 'draw') {
      if (!selectedClass) { toast.warn('Select a class first'); return; }
      drawing.current = true;
      startPos.current = pos;
      currentBox.current = { x: pos.x, y: pos.y, w: 0, h: 0, color: selectedClass.color };
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (isDragging.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy });
      return;
    }

    if (drawing.current) {
      const pos = canvasToImage(cx, cy);
      const s = startPos.current;
      currentBox.current = {
        x: Math.min(s.x, pos.x),
        y: Math.min(s.y, pos.y),
        w: Math.abs(pos.x - s.x),
        h: Math.abs(pos.y - s.y),
        color: stateRef.current.selectedClass?.color || '#6C63FF'
      };
      redraw();
    }
  };

  const handleMouseUp = () => {
    if (isDragging.current) { isDragging.current = false; return; }
    if (!drawing.current) return;
    drawing.current = false;
    const cb = currentBox.current;
    if (!cb || cb.w < 5 || cb.h < 5) { currentBox.current = null; redraw(); return; }
    const { selectedClass } = stateRef.current;
    const newBox = {
      x: Math.round(cb.x), y: Math.round(cb.y),
      w: Math.round(cb.w), h: Math.round(cb.h),
      classId: selectedClass.id,
      className: selectedClass.name,
      color: selectedClass.color
    };
    setBoxes(prev => [...prev, newBox]);
    setSelectedBox(null);
    currentBox.current = null;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setZoom(z => {
      const nz = Math.max(0.1, Math.min(10, z * delta));
      setPan(p => ({
        x: mx - (mx - p.x) * (nz / z),
        y: my - (my - p.y) * (nz / z)
      }));
      return nz;
    });
  };

  const deleteBox = (idx) => {
    setBoxes(b => b.filter((_, i) => i !== idx));
    setSelectedBox(null);
  };

  const deleteSelected = useCallback(() => {
    if (stateRef.current.selectedBox !== null) {
      deleteBox(stateRef.current.selectedBox);
    }
  }, []);

  useEffect(() => {
    const handle = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && e.target.tagName !== 'INPUT') {
        deleteSelected();
      }
      if (e.key === 'd' || e.key === 'D') setTool('draw');
      if (e.key === 's' || e.key === 'S') setTool('select');
      if (e.key === 'p' || e.key === 'P') setTool('pan');
      if (e.key === 'ArrowRight') navigateImage(1);
      if (e.key === 'ArrowLeft') navigateImage(-1);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [deleteSelected]);

  const navigateImage = (dir) => {
    const newIdx = currentIdx + dir;
    if (newIdx >= 0 && newIdx < allImages.length) {
      saveAnnotations(false).then(() => {
        navigate(`/project/${projectId}/annotate/${allImages[newIdx]._id}`);
      });
    }
  };

  const saveAnnotations = async (showToast = true) => {
    setSaving(true);
    try {
      await axios.post(`/api/annotations/${projectId}/${imageId}`, { boxes: stateRef.current.boxes });
      if (showToast) toast.success('Annotations saved!');
    } catch { if (showToast) toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const resetView = () => {
    if (!imgRef.current || !containerRef.current) return;
    const img = imgRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    const cw = rect.width || 800;
    const ch = rect.height || 600;
    const initZoom = Math.min(cw / img.naturalWidth, ch / img.naturalHeight, 1.5);
    const initPanX = (cw - img.naturalWidth * initZoom) / 2;
    const initPanY = (ch - img.naturalHeight * initZoom) / 2;
    setZoom(initZoom);
    setPan({ x: Math.max(0, initPanX), y: Math.max(0, initPanY) });
  };

  const cursor = tool === 'draw' ? 'crosshair' : tool === 'pan' ? 'grab' : 'default';

  return (
    <div className="annotation-page">
      {/* Top bar */}
      <div className="ann-topbar">
        <div className="ann-topbar-left">
          <button className="btn btn-secondary btn-sm" onClick={() => { saveAnnotations(false); navigate(`/project/${projectId}`); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span className="ann-image-name">{image?.originalName}</span>
          <span className="ann-idx mono">{currentIdx + 1} / {allImages.length}</span>
        </div>
        <div className="ann-tools">
          {[
            { id: 'draw', icon: '⊹', label: 'Draw (D)' },
            { id: 'select', icon: '↖', label: 'Select (S)' },
            { id: 'pan', icon: '✥', label: 'Pan (P)' },
          ].map(t => (
            <button key={t.id} className={`tool-btn ${tool === t.id ? 'active' : ''}`}
              onClick={() => setTool(t.id)} title={t.label}>
              {t.icon} {t.label.split(' ')[0]}
            </button>
          ))}
        </div>
        <div className="ann-topbar-right">
          <span className="zoom-badge mono">{Math.round(zoom * 100)}%</span>
          <button className="btn btn-secondary btn-sm" onClick={resetView} title="Reset view">⊕ Fit</button>
          <button className="btn btn-primary btn-sm" onClick={() => saveAnnotations()} disabled={saving}>
            {saving ? '...' : '💾 Save'}
          </button>
        </div>
      </div>

      <div className="ann-workspace">
        {/* Left: Canvas */}
        <div className="ann-canvas-area" ref={containerRef} style={{ position: 'relative' }}>
          <img ref={imgRef}
            src={image?.path ? `http://localhost:5000${image.path}` : ''}
            alt="" style={{ display: 'none' }}
            onLoad={setupCanvas} />
          {imgLoaded ? (
            <canvas
              ref={canvasRef}
              className="ann-canvas"
              style={{ cursor, position: 'absolute', top: 0, left: 0 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
          ) : (
            <div className="flex-center" style={{ height: '100%', color: 'var(--text2)' }}>
              <div className="spin" style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%' }} />
            </div>
          )}

          {/* Nav arrows */}
          {currentIdx > 0 && (
            <button className="nav-arrow nav-arrow-left" onClick={() => navigateImage(-1)} title="Previous (←)">‹</button>
          )}
          {currentIdx < allImages.length - 1 && (
            <button className="nav-arrow nav-arrow-right" onClick={() => navigateImage(1)} title="Next (→)">›</button>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="ann-sidebar">
          {/* Classes */}
          <div className="sidebar-section">
            <div className="sidebar-title">Classes</div>
            {project?.classes?.length > 0 ? (
              <div className="class-list">
                {project.classes.map(c => (
                  <div key={c.id}
                    className={`class-item ${selectedClass?.id === c.id ? 'active' : ''}`}
                    onClick={() => { setSelectedClass(c); setTool('draw'); }}
                  >
                    <div className="class-swatch" style={{ background: c.color }} />
                    <span className="class-label">{c.name}</span>
                    <span className="class-id-badge mono">#{c.id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sidebar-empty">No classes — add in project settings</p>
            )}
          </div>

          {/* Boxes list */}
          <div className="sidebar-section">
            <div className="sidebar-title flex-between">
              <span>Annotations ({boxes.length})</span>
              {boxes.length > 0 && (
                <button className="btn btn-danger btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => { setBoxes([]); setSelectedBox(null); }}>
                  Clear All
                </button>
              )}
            </div>
            <div className="boxes-list">
              {boxes.length === 0 ? (
                <p className="sidebar-empty">Draw boxes on the image</p>
              ) : boxes.map((b, i) => (
                <div key={i}
                  className={`box-item ${selectedBox === i ? 'active' : ''}`}
                  onClick={() => setSelectedBox(selectedBox === i ? null : i)}
                >
                  <div className="box-swatch" style={{ background: b.color }} />
                  <div className="box-info">
                    <span className="box-class">{b.className}</span>
                    <span className="box-coords mono">{Math.round(b.x)},{Math.round(b.y)} {Math.round(b.w)}×{Math.round(b.h)}</span>
                  </div>
                  <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); deleteBox(i); }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className="sidebar-section shortcuts">
            <div className="sidebar-title">Shortcuts</div>
            <div className="shortcuts-list">
              {[['D', 'Draw mode'], ['S', 'Select mode'], ['P', 'Pan mode'], ['Del', 'Delete box'], ['←/→', 'Prev/Next image'], ['Scroll', 'Zoom']].map(([k, v]) => (
                <div key={k} className="shortcut-row">
                  <kbd>{k}</kbd><span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
