import { useRef, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';

const SAMPLE_FORMS = [
  {
    id: null, // will be populated from DB
    icon: '🏦',
    name: 'Bank Account Opening',
    desc: 'KYC, personal details, nominee',
    category: 'banking',
  },
  {
    id: null,
    icon: '🏫',
    name: 'School Admission Form',
    desc: 'Student details, parent info',
    category: 'education',
  },
  {
    id: null,
    icon: '📋',
    name: 'Ration Card Application',
    desc: 'Family details, address proof',
    category: 'government',
  },
];

export default function FormUpload() {
  const { state, dispatch } = useStore();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState(null);

  // Load sample templates from backend on mount
  useState(() => {
    setLoadingTemplates(true);
    api.getTemplates()
      .then(data => setTemplates(data.templates || []))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, []);

  const startDetecting = useCallback(async (file) => {
    if (!file) return;
    dispatch({ type: 'SET_SCREEN', payload: 'detecting' });
    dispatch({ type: 'SET_DETECTION_PROGRESS', payload: 0 });
    dispatch({ type: 'SET_DETECTION_ERROR', payload: null });

    try {
      const data = await api.uploadFormImage(file, (pct) => {
        dispatch({ type: 'SET_DETECTION_PROGRESS', payload: pct });
      });
      dispatch({ type: 'SET_TEMPLATE', payload: data.template });
      // Create session
      const session = await api.createSession(data.template._id, state.userId, state.language);
      dispatch({ type: 'SET_SESSION', payload: session.session });
      dispatch({ type: 'SET_SCREEN', payload: 'voice' });
    } catch (err) {
      dispatch({ type: 'SET_DETECTION_ERROR', payload: err.message });
    }
  }, [state.userId, state.language, dispatch]);

  const handleFile = useCallback((file) => {
    if (file && file.type.startsWith('image/')) {
      startDetecting(file);
    } else {
      setError('Please select an image file (JPEG, PNG, WebP)');
    }
  }, [startDetecting]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }, [handleFile]);

  const handleSampleSelect = useCallback(async (template) => {
    dispatch({ type: 'SET_SCREEN', payload: 'detecting' });
    dispatch({ type: 'SET_DETECTION_PROGRESS', payload: 80 });
    try {
      const data = await api.selectSampleTemplate(template._id);
      dispatch({ type: 'SET_TEMPLATE', payload: data.template });
      const session = await api.createSession(data.template._id, state.userId, state.language);
      dispatch({ type: 'SET_SESSION', payload: session.session });
      dispatch({ type: 'SET_SCREEN', payload: 'voice' });
    } catch (err) {
      dispatch({ type: 'SET_DETECTION_ERROR', payload: err.message });
    }
  }, [state.userId, state.language, dispatch]);

  return (
    <div className="screen" style={{ maxWidth: 480, margin: '0 auto', gap: 'var(--space-5)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'language' })}
        >← Back</button>
        <span className="topbar-logo">Speak<span>2</span>Fill</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'history' })}
        >📋 History</button>
      </div>

      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
        Upload a Form
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '-var(--space-3)' }}>
        Take a photo or upload an image of your paper form — our AI will read it for you.
      </p>

      {/* Camera / Gallery buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => cameraInputRef.current?.click()}
          style={{ flexDirection: 'column', gap: 4 }}
        >
          <span style={{ fontSize: 28 }}>📷</span>
          <span style={{ fontSize: 'var(--text-sm)' }}>Camera</span>
        </button>
        <button
          className="btn btn-outline btn-lg"
          onClick={() => fileInputRef.current?.click()}
          style={{ flexDirection: 'column', gap: 4 }}
        >
          <span style={{ fontSize: 28 }}>🖼️</span>
          <span style={{ fontSize: 'var(--text-sm)' }}>Gallery</span>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Drag & drop zone */}
      <div
        className={`upload-zone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <span className="upload-zone-icon">📂</span>
        <span className="upload-zone-text">Drag & drop form image here</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-light)' }}>or click to browse files</span>
      </div>

      {error && (
        <div style={{
          background: 'rgba(217,79,79,0.1)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          color: 'var(--color-error)',
          fontSize: 'var(--text-sm)',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3" style={{ color: 'var(--color-text-light)', fontSize: 'var(--text-sm)' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        or try a sample form
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>

      {/* Sample forms */}
      <div className="sample-grid">
        {(templates.length > 0 ? templates : SAMPLE_FORMS.map((s, i) => ({ ...s, _id: `sample-${i}` }))).map((tpl) => (
          <button
            key={tpl._id}
            className="sample-card"
            onClick={() => templates.length > 0 ? handleSampleSelect(tpl) : null}
            disabled={templates.length === 0}
          >
            <span className="sample-icon">{
              tpl.category === 'banking' ? '🏦' :
              tpl.category === 'education' ? '🏫' :
              tpl.category === 'government' ? '📋' : '📄'
            }</span>
            <div className="sample-info">
              <div className="sample-name">{tpl.name}</div>
              <div className="sample-desc">{tpl.description || 'Tap to start filling'}</div>
            </div>
            <span style={{ color: 'var(--color-primary)', fontSize: 20 }}>→</span>
          </button>
        ))}
        {loadingTemplates && (
          <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)' }}>
            Loading templates…
          </div>
        )}
      </div>
    </div>
  );
}
