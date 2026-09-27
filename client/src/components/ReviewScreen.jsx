import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { playChime } from '../utils/audio';

export default function ReviewScreen() {
  const { state, dispatch } = useStore();
  const { activeTemplate, activeSession, answers, language } = state;

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const fields = activeTemplate?.fields || [];
  const imageUrl = activeTemplate?.imageUrl;

  // ── Draw canvas overlay ──────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;

    const W = img.naturalWidth;
    const H = img.naturalHeight;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, W, H);

    // Overlay each answer
    fields.forEach((field) => {
      const ans = answers[field.id];
      if (!ans || ans === '(skipped)') return;
      const pos = field.position;
      if (!pos) return;

      // Convert % to px (positions are percentages 0-100)
      const x = (pos.x / 100) * W;
      const y = (pos.y / 100) * H;
      const w = (pos.width / 100) * W;
      const h = (pos.height / 100) * H;

      // Background bubble
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = '#EAF6FB';
      roundRect(ctx, x, y, w, Math.max(h, 28), 6);
      ctx.fill();

      // Border
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#0D5C75';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, w, Math.max(h, 28), 6);
      ctx.stroke();

      // Text
      ctx.fillStyle = '#0D5C75';
      ctx.font = `bold ${Math.max(14, h * 0.5)}px Segoe UI, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(ans, x + 8, y + Math.max(h, 28) / 2, w - 16);
      ctx.restore();
    });

    setCanvasReady(true);
  }, [fields, answers]);

  // Helper: rounded rect
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Load image into hidden <img> then draw
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      drawCanvas();
    };
    img.onerror = () => setCanvasReady(false);
    img.src = imageUrl;
  }, [imageUrl, drawCanvas]);

  // Redraw when answers change
  useEffect(() => {
    if (imgRef.current?.complete) drawCanvas();
  }, [answers, drawCanvas]);

  // ── Download PNG ──────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${activeTemplate?.name || 'filled-form'}-speak2fill.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      playChime('confirm');
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  }, [activeTemplate]);

  // ── Submit / Complete session ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!activeSession) return;
    setSaving(true);
    try {
      await api.completeSession(activeSession._id);
      setSaved(true);
      playChime('confirm');
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }, [activeSession]);

  // ── Inline edit ──────────────────────────────────────────────────────────
  const startEdit = (field) => {
    setEditingField(field.id);
    setEditValue(answers[field.id] || '');
  };
  const saveEdit = () => {
    if (!editingField) return;
    dispatch({ type: 'SET_ANSWER', fieldId: editingField, answer: editValue });
    // Persist edit to backend if possible
    if (activeSession) {
      const field = fields.find(f => f.id === editingField);
      if (field) {
        api.saveFieldAnswer(activeSession._id, {
          fieldId: field.id,
          fieldLabel: field.label,
          answer: editValue,
          inputMethod: 'edited',
        }).catch(() => {});
      }
    }
    setEditingField(null);
  };

  const answeredCount = fields.filter(f => answers[f.id] && answers[f.id] !== '(skipped)').length;

  return (
    <div className="screen" style={{ maxWidth: 480, margin: '0 auto', gap: 'var(--space-6)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'voice' })}
        >← Edit Answers</button>
        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Review Form</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'history' })}
        >📋 History</button>
      </div>

      {/* Summary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 'var(--space-3)',
        textAlign: 'center',
      }}>
        {[
          { label: 'Filled', value: answeredCount, color: 'var(--color-success)' },
          { label: 'Skipped', value: fields.filter(f => answers[f.id] === '(skipped)').length, color: 'var(--color-warning)' },
          { label: 'Total', value: fields.length, color: 'var(--color-primary)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Canvas preview (image generation) ─────────────────────────────── */}
      {imageUrl ? (
        <div>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--color-primary)' }}>
            📄 Filled Form Preview
          </h3>
          <div className="review-canvas-wrap">
            {!canvasReady && (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto var(--space-4)' }} />
                Loading form image…
              </div>
            )}
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: 'auto',
                display: canvasReady ? 'block' : 'none',
              }}
              aria-label="Filled form preview"
            />
          </div>

          {/* Download PNG */}
          <button
            className="btn btn-primary w-full"
            style={{ marginTop: 'var(--space-3)' }}
            onClick={handleDownload}
            disabled={!canvasReady || downloading}
          >
            {downloading ? '⏳ Generating…' : '⬇️ Download Filled Form (PNG)'}
          </button>
        </div>
      ) : (
        <div style={{
          padding: 'var(--space-6)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          border: '1px dashed var(--color-border)',
        }}>
          📄 No form image to preview (sample form or text-only)
        </div>
      )}

      {/* ── Answers table ─────────────────────────────────────────────────── */}
      <div>
        <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--color-primary)' }}>
          📝 Your Answers
        </h3>
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <table className="review-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Answer</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fields.map(field => {
                const ans = answers[field.id] || '—';
                const isEditing = editingField === field.id;
                return (
                  <tr key={field.id}>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', maxWidth: 140 }}>
                      {field.label}
                      {field.required && <span style={{ color: 'var(--color-accent)', marginLeft: 4 }}>*</span>}
                    </td>
                    <td className="answer-cell">
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <input
                            className="input-field"
                            style={{ minHeight: 36, padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-sm)' }}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEdit()}
                            autoFocus
                          />
                          <button className="btn btn-sm btn-primary" onClick={saveEdit}>✓</button>
                        </div>
                      ) : (
                        <span style={{ color: ans === '—' || ans === '(skipped)' ? 'var(--color-text-light)' : 'var(--color-primary)' }}>
                          {ans}
                        </span>
                      )}
                    </td>
                    <td>
                      {!isEditing && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => startEdit(field)}
                          title="Edit"
                          style={{ padding: '4px 8px', fontSize: 14 }}
                        >
                          ✏️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Submit buttons ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', paddingBottom: 'var(--space-8)' }}>
        <button
          className="btn btn-outline"
          onClick={() => {
            dispatch({ type: 'RESET_FORM' });
            dispatch({ type: 'SET_SCREEN', payload: 'upload' });
          }}
        >
          🔄 New Form
        </button>
        <button
          className="btn btn-accent btn-lg"
          onClick={handleSubmit}
          disabled={saving || saved}
        >
          {saved ? '✅ Saved!' : saving ? '⏳ Saving…' : '💾 Save & Submit'}
        </button>
      </div>
    </div>
  );
}
