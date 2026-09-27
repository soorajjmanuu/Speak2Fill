import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

const STEPS = [
  { icon: '📸', label: 'Reading form image…' },
  { icon: '🤖', label: 'AI analyzing fields…' },
  { icon: '🔍', label: 'Identifying field types…' },
  { icon: '📝', label: 'Mapping positions…' },
  { icon: '✅', label: 'Preparing your form…' },
];

export default function DetectingScreen() {
  const { state, dispatch } = useStore();
  const stepRef = useRef(0);
  const currentStep = Math.min(
    Math.floor((state.detectionProgress / 100) * STEPS.length),
    STEPS.length - 1
  );

  const step = STEPS[currentStep];

  return (
    <div className="screen" style={{
      maxWidth: 480,
      margin: '0 auto',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-8)',
      textAlign: 'center',
    }}>
      {/* Scanner illustration */}
      <div style={{
        width: 220,
        height: 280,
        borderRadius: 'var(--radius-xl)',
        border: '3px solid var(--color-primary)',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-xl)',
      }}>
        {/* Document lines */}
        {[30, 50, 65, 80, 95, 108, 120, 135].map((top, i) => (
          <div key={i} style={{
            position: 'absolute',
            top,
            left: 24,
            right: 24,
            height: i % 3 === 0 ? 12 : 6,
            borderRadius: 4,
            background: i % 3 === 0
              ? 'var(--color-surface-2)'
              : 'rgba(0,0,0,0.06)',
            animation: `fadeInLine 0.4s ease ${i * 0.12}s both`,
          }} />
        ))}
        {/* Scanning beam */}
        <div className="scanner-beam" style={{ animationDuration: '1.5s' }} />
        {/* Corner brackets */}
        {['0 0', '0 auto', 'auto 0', 'auto auto'].map((m, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: i < 2 ? 8 : 'auto',
            bottom: i >= 2 ? 8 : 'auto',
            left: i % 2 === 0 ? 8 : 'auto',
            right: i % 2 === 1 ? 8 : 'auto',
            width: 20,
            height: 20,
            borderTop: i < 2 ? '3px solid var(--color-accent)' : 'none',
            borderBottom: i >= 2 ? '3px solid var(--color-accent)' : 'none',
            borderLeft: i % 2 === 0 ? '3px solid var(--color-accent)' : 'none',
            borderRight: i % 2 === 1 ? '3px solid var(--color-accent)' : 'none',
          }} />
        ))}
      </div>

      {/* Status */}
      <div>
        <div style={{ fontSize: 40, marginBottom: 'var(--space-3)', animation: 'spin 0.5s ease' }}>
          {step.icon}
        </div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
          {step.label}
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
          OpenAI GPT-4o is reading your form
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%' }}>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.max(5, state.detectionProgress)}%` }}
          />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'var(--space-2)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
        }}>
          <span>Scanning…</span>
          <span>{Math.round(state.detectionProgress)}%</span>
        </div>
      </div>

      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{
            width: i <= currentStep ? 32 : 8,
            height: 8,
            borderRadius: 4,
            background: i < currentStep
              ? 'var(--color-success)'
              : i === currentStep
              ? 'var(--color-primary)'
              : 'var(--color-border)',
            transition: 'all 0.4s ease',
          }} />
        ))}
      </div>

      {/* Error state */}
      {state.detectionError && (
        <div style={{
          background: 'rgba(217,79,79,0.08)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          textAlign: 'center',
          maxWidth: 360,
        }}>
          <div style={{ fontSize: 32, marginBottom: 'var(--space-3)' }}>❌</div>
          <p style={{ color: 'var(--color-error)', fontWeight: 600 }}>Detection failed</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 'var(--space-2) 0 var(--space-4)' }}>
            {state.detectionError}
          </p>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'upload' })}
          >← Try again</button>
        </div>
      )}

      <style>{`
        @keyframes fadeInLine {
          from { opacity: 0; transform: scaleX(0.6); }
          to   { opacity: 1; transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
