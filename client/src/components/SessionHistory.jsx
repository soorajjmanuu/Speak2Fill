import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

const STATUS_COLORS = {
  'in-progress': 'var(--color-warning)',
  'completed': 'var(--color-success)',
  'abandoned': 'var(--color-text-light)',
};

export default function SessionHistory() {
  const { state, dispatch } = useStore();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!state.userId) return;
    setLoading(true);
    api.getSessions(state.userId)
      .then(data => setSessions(data.sessions || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [state.userId]);

  const handleResume = async (session) => {
    try {
      const tplData = await api.getTemplate(session.templateId);
      dispatch({ type: 'SET_TEMPLATE', payload: tplData.template });
      dispatch({ type: 'SET_SESSION', payload: session });
      // Calculate where to resume
      const answeredIds = new Set(session.fieldProgress?.map(fp => fp.fieldId) || []);
      const fields = tplData.template.fields || [];
      const nextIdx = fields.findIndex(f => !answeredIds.has(f.id));
      dispatch({ type: 'SET_FIELD_INDEX', payload: nextIdx >= 0 ? nextIdx : 0 });
      // Pre-fill answers from session history
      session.fieldProgress?.forEach(fp => {
        dispatch({ type: 'SET_ANSWER', fieldId: fp.fieldId, answer: fp.answer });
      });
      dispatch({ type: 'SET_SCREEN', payload: session.status === 'completed' ? 'review' : 'voice' });
    } catch (err) {
      setError('Failed to load session: ' + err.message);
    }
  };

  return (
    <div className="screen" style={{ maxWidth: 480, margin: '0 auto', gap: 'var(--space-5)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'upload' })}
        >← Back</button>
        <span style={{ fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--color-primary)' }}>📋 History</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            dispatch({ type: 'RESET_FORM' });
            dispatch({ type: 'SET_SCREEN', payload: 'upload' });
          }}
        >+ New</button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="spinner" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Loading sessions…</p>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(217,79,79,0.08)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          color: 'var(--color-error)',
          fontSize: 'var(--text-sm)',
        }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-12) var(--space-4)',
          color: 'var(--color-text-muted)',
        }}>
          <div style={{ fontSize: 64, marginBottom: 'var(--space-4)' }}>📭</div>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>No sessions yet</h3>
          <p>Upload a form to get started!</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 'var(--space-6)' }}
            onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'upload' })}
          >
            Upload a Form →
          </button>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {sessions.map(session => {
            const progress = session.fieldProgress?.length || 0;
            const total = session.totalFields || 0;
            const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
            return (
              <div
                key={session._id}
                className="card card-sm"
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }}>
                    {session.formCategory === 'banking' ? '🏦' :
                     session.formCategory === 'education' ? '🏫' :
                     session.formCategory === 'government' ? '📋' : '📄'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-md)' }}>
                      {session.formName || 'Untitled Form'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {formatDate(session.updatedAt || session.createdAt)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    color: STATUS_COLORS[session.status] || 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {session.status}
                  </span>
                </div>

                {/* Progress */}
                {total > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      <span>{progress}/{total} fields</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="progress-bar-track" style={{ height: 6 }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {/* Action */}
                <button
                  className={`btn ${session.status === 'completed' ? 'btn-outline' : 'btn-primary'} btn-sm`}
                  onClick={() => handleResume(session)}
                  style={{ alignSelf: 'flex-end' }}
                >
                  {session.status === 'completed' ? '👁️ View' : '▶️ Resume'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
