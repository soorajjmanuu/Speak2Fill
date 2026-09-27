import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { playTTS, AudioRecorder, playChime } from '../utils/audio';
import { api } from '../utils/api';
import { validateAndNormalize } from '../utils/validators';
import { t } from '../utils/translations';

const LANG_SARVAM = { ml: 'ml-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', en: 'en-IN' };

function FieldProgress({ current, total }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
        <span>Field {current + 1} of {total}</span>
        <span>{Math.round(((current) / total) * 100)}% done</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>
    </div>
  );
}

function WaveformCanvas({ isRecording }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (!isRecording) {
      // Draw flat line
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.strokeStyle = 'var(--color-border)';
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }

    // Animated waveform when recording
    let phase = 0;
    function draw() {
      animRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      const mid = canvas.height / 2;
      for (let x = 0; x < canvas.width; x++) {
        const amp = 20 + Math.sin(x * 0.03 + phase) * 10;
        const y = mid + Math.sin(x * 0.08 + phase * 1.5) * amp;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#E06D53';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      phase += 0.1;
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      width={380}
      height={64}
      aria-hidden="true"
    />
  );
}

export default function VoiceCard() {
  const { state, dispatch } = useStore();
  const { activeTemplate, activeSession, currentFieldIndex, language, answers } = state;

  const fields = activeTemplate?.fields || [];
  const field = fields[currentFieldIndex];

  const [typedAnswer, setTypedAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [recordDuration, setRecordDuration] = useState(0);

  const recorderRef = useRef(null);
  const timerRef = useRef(null);

  // Pre-fill from cached answers
  useEffect(() => {
    if (!field) return;
    setTypedAnswer(answers[field.id] || '');
    setTranscript('');
    setStatusMsg('');
    setIsRecording(false);
    setIsProcessing(false);
    setRecordDuration(0);
  }, [currentFieldIndex, field?.id]);

  // Auto-play TTS prompt when field changes
  useEffect(() => {
    if (!field) return;
    const prompt = field.helpPrompts?.[language] || field.label;
    setIsSpeaking(true);
    setStatusMsg('🔊 Playing voice prompt…');
    playTTS(prompt, language)
      .catch(() => {})
      .finally(() => {
        setIsSpeaking(false);
        setStatusMsg('');
      });
    return () => setIsSpeaking(false);
  }, [currentFieldIndex, language, field?.id]);

  const speakPrompt = useCallback(() => {
    if (!field || isSpeaking) return;
    const prompt = field.helpPrompts?.[language] || field.label;
    setIsSpeaking(true);
    setStatusMsg('🔊 Repeating…');
    playTTS(prompt, language)
      .catch(() => {})
      .finally(() => { setIsSpeaking(false); setStatusMsg(''); });
  }, [field, language, isSpeaking]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    setIsRecording(true);
    setTranscript('');
    setStatusMsg('🎤 Listening…');
    setRecordDuration(0);

    // Duration timer
    timerRef.current = setInterval(() => {
      setRecordDuration(d => d + 1);
    }, 1000);

    recorderRef.current = new AudioRecorder();
    try {
      await recorderRef.current.start();
      playChime('start');
    } catch (err) {
      setIsRecording(false);
      setStatusMsg('❌ Microphone access denied');
      clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const stopRecording = useCallback(async () => {
    if (!isRecording || !recorderRef.current) return;
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsProcessing(true);
    setStatusMsg('⏳ Transcribing…');
    playChime('stop');

    try {
      const blob = await recorderRef.current.stop();
      const sarvamLang = LANG_SARVAM[language] || 'en-IN';
      const data = await api.transcribeAudioBlob(blob, sarvamLang);
      const text = data.transcript || '';
      setTranscript(text);
      setTypedAnswer(text);
      setStatusMsg(text ? '✅ Got it! Edit if needed.' : '⚠️ Couldn\'t hear — please type or try again');
    } catch (err) {
      setStatusMsg('❌ Transcription failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [isRecording, language]);

  const handleSave = useCallback(async () => {
    if (!field || !activeSession) return;
    const raw = typedAnswer.trim();
    if (!raw) {
      setStatusMsg('⚠️ Please speak or type an answer first');
      return;
    }
    const normalized = validateAndNormalize(raw, field.type, language).value;
    dispatch({ type: 'SET_ANSWER', fieldId: field.id, answer: normalized });

    try {
      await api.saveFieldAnswer(activeSession._id, {
        fieldId: field.id,
        fieldLabel: field.label,
        answer: normalized,
        inputMethod: transcript ? 'voice' : 'typed',
      });
      playChime('confirm');
    } catch (_) { /* non-critical */ }

    dispatch({ type: 'NEXT_FIELD' });
  }, [field, activeSession, typedAnswer, transcript, language, dispatch]);

  const handleSkip = useCallback(async () => {
    if (!field) return;
    dispatch({ type: 'SET_ANSWER', fieldId: field.id, answer: '' });
    if (activeSession) {
      await api.saveFieldAnswer(activeSession._id, {
        fieldId: field.id,
        fieldLabel: field.label,
        answer: '(skipped)',
        inputMethod: 'skipped',
      }).catch(() => {});
    }
    dispatch({ type: 'NEXT_FIELD' });
  }, [field, activeSession, dispatch]);

  const handleBack = useCallback(() => {
    dispatch({ type: 'PREV_FIELD' });
  }, [dispatch]);

  if (!field) {
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-4)' }}>Loading form…</p>
      </div>
    );
  }

  const formatDuration = (s) => `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`;

  return (
    <div className="screen" style={{ maxWidth: 480, margin: '0 auto', gap: 'var(--space-5)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button className="btn btn-ghost btn-sm" onClick={handleBack} disabled={currentFieldIndex === 0}>
          ← Back
        </button>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          {activeTemplate?.name}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'review' })}
        >Review</button>
      </div>

      {/* Progress */}
      <FieldProgress current={currentFieldIndex} total={fields.length} />

      {/* Main field card */}
      <div className="field-card">
        {/* Field badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="badge badge-primary">{field.type?.toUpperCase() || 'TEXT'}</span>
          {field.required && <span className="badge badge-accent">Required</span>}
        </div>

        {/* Field label */}
        <div>
          <h2 className="field-label">{field.label}</h2>
          {field.helpPrompts?.[language] && (
            <p className="field-help" style={{ marginTop: 'var(--space-2)' }}>
              {field.helpPrompts[language]}
            </p>
          )}
          {field.expectedFormat && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', marginTop: 4 }}>
              Format: {field.expectedFormat}
            </p>
          )}
        </div>

        {/* ── DUAL INPUT: Typing ──────────────────── */}
        <div>
          <label style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-2)',
          }}>
            ✏️ Type your answer (or speak below)
          </label>
          {field.type === 'checkbox' ? (
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              {['Yes', 'No'].map(opt => (
                <button
                  key={opt}
                  className={`btn ${typedAnswer === opt ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => { setTypedAnswer(opt); setTranscript(''); }}
                  style={{ minWidth: 80 }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className="input-field"
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}…`}
              value={typedAnswer}
              onChange={(e) => { setTypedAnswer(e.target.value); setTranscript(''); }}
              rows={field.type === 'address' ? 3 : 1}
              style={{ resize: 'vertical' }}
              aria-label={`Type answer for ${field.label}`}
            />
          )}
        </div>

        {/* ── DUAL INPUT: Voice ───────────────────── */}
        <div>
          <label style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-2)',
          }}>
            🎙️ Or speak your answer
          </label>

          {/* Waveform */}
          <WaveformCanvas isRecording={isRecording} />

          {/* Mic controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
            {/* Big mic button */}
            {!isRecording ? (
              <button
                className="mic-btn"
                onClick={startRecording}
                disabled={isProcessing || isSpeaking}
                aria-label="Start recording"
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            ) : (
              <button
                className="mic-btn recording"
                onClick={stopRecording}
                aria-label="Stop recording"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            )}

            <div style={{ flex: 1 }}>
              {isRecording && (
                <div style={{ fontWeight: 700, color: 'var(--color-error)', fontSize: 'var(--text-lg)' }}>
                  ● {formatDuration(recordDuration)}
                </div>
              )}
              {statusMsg && !isRecording && (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {statusMsg}
                </div>
              )}
              {isRecording && (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  Tap the square to stop
                </div>
              )}
              {isProcessing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Transcribing…</span>
                </div>
              )}
            </div>

            {/* Repeat TTS */}
            <button
              className="btn btn-outline btn-icon"
              onClick={speakPrompt}
              disabled={isSpeaking || isRecording}
              title="Repeat question"
              aria-label="Repeat question aloud"
            >
              🔊
            </button>
          </div>

          {/* Transcript preview */}
          {transcript && (
            <div style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(13,92,117,0.06)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-primary)',
              fontStyle: 'italic',
            }}>
              🎤 Heard: "{transcript}"
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-3)' }}>
        <button
          className="btn btn-ghost"
          onClick={handleSkip}
          disabled={isRecording || isProcessing}
        >
          Skip →
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSave}
          disabled={isRecording || isProcessing || !typedAnswer.trim()}
        >
          {currentFieldIndex >= fields.length - 1 ? '✅ Finish & Review' : 'Save & Next →'}
        </button>
      </div>
    </div>
  );
}
