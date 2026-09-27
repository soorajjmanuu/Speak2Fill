import { useStore } from '../store/useStore';
import { playTTS } from '../utils/audio';
import { useCallback } from 'react';

const LANGUAGES = [
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🌴', sarvam: 'ml-IN' },
  { code: 'hi', name: 'Hindi',     native: 'हिन्दी',  flag: '🇮🇳', sarvam: 'hi-IN' },
  { code: 'ta', name: 'Tamil',     native: 'தமிழ்',   flag: '🌺', sarvam: 'ta-IN' },
  { code: 'te', name: 'Telugu',    native: 'తెలుగు',  flag: '🌸', sarvam: 'te-IN' },
  { code: 'en', name: 'English',   native: 'English', flag: '🔤', sarvam: 'en-IN' },
];

const GREETINGS = {
  ml: 'ഈ ആപ്പ് ഫോം പൂരിപ്പിക്കാൻ നിങ്ങളെ സഹായിക്കും.',
  hi: 'यह ऐप फॉर्म भरने में आपकी मदद करेगा।',
  ta: 'இந்த ஆப் படிவம் நிரப்ப உங்களுக்கு உதவும்.',
  te: 'ఈ యాప్ ఫారమ్ నింపడానికి మీకు సహాయం చేస్తుంది.',
  en: 'This app will help you fill out any form by speaking.',
};

export default function LanguageSelect() {
  const { state, dispatch } = useStore();

  const handleSelect = useCallback(async (lang) => {
    dispatch({ type: 'SET_LANGUAGE', payload: lang.code });
    try {
      await playTTS(GREETINGS[lang.code], lang.code);
    } catch (_) { /* audio optional */ }
  }, [dispatch]);

  const handleContinue = () => {
    dispatch({ type: 'SET_SCREEN', payload: 'upload' });
  };

  return (
    <div className="screen" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <div style={{ fontSize: 64 }}>🎙️</div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-primary)', marginTop: 'var(--space-3)' }}>
          Speak<span style={{ color: 'var(--color-accent)' }}>2</span>Fill
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', fontSize: 'var(--text-md)' }}>
          Fill any form by just speaking
        </p>
      </div>

      {/* Language instruction */}
      <h2 style={{
        fontSize: 'var(--text-xl)',
        fontWeight: 700,
        textAlign: 'center',
        marginBottom: 'var(--space-5)',
        color: 'var(--color-text)',
      }}>
        Choose your language
      </h2>

      {/* Language grid */}
      <div className="lang-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            className={`lang-card${state.language === lang.code ? ' selected' : ''}`}
            onClick={() => handleSelect(lang)}
            aria-pressed={state.language === lang.code}
          >
            <span className="lang-flag" role="img" aria-label={lang.name}>{lang.flag}</span>
            <span className="lang-name">{lang.native}</span>
            <span className="lang-native">{lang.name}</span>
            {state.language === lang.code && (
              <span style={{
                fontSize: 'var(--text-xs)',
                background: 'var(--color-primary)',
                color: 'white',
                borderRadius: 'var(--radius-full)',
                padding: '2px 8px',
                fontWeight: 700,
              }}>✓ Selected</span>
            )}
          </button>
        ))}
      </div>

      {/* Tap-to-preview note */}
      <p style={{
        textAlign: 'center',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-muted)',
        marginBottom: 'var(--space-6)',
      }}>
        🔊 Tap a language to hear a voice preview
      </p>

      {/* Continue */}
      <button
        className="btn btn-primary btn-lg w-full"
        onClick={handleContinue}
        style={{ marginTop: 'auto' }}
      >
        Continue →
      </button>

      {/* Accessibility controls */}
      <div className="a11y-controls" style={{ justifyContent: 'center', marginTop: 'var(--space-6)', gap: 'var(--space-3)' }}>
        <button
          className="a11y-btn"
          title="Normal text"
          onClick={() => dispatch({ type: 'SET_TEXT_SIZE', payload: 'normal' })}
          aria-label="Normal text size"
        >A</button>
        <button
          className="a11y-btn"
          title="Large text"
          onClick={() => dispatch({ type: 'SET_TEXT_SIZE', payload: 'large' })}
          aria-label="Large text size"
          style={{ fontSize: 'var(--text-md)' }}
        >A+</button>
        <button
          className="a11y-btn"
          title="Extra large text"
          onClick={() => dispatch({ type: 'SET_TEXT_SIZE', payload: 'xlarge' })}
          aria-label="Extra large text size"
          style={{ fontSize: 'var(--text-lg)' }}
        >A++</button>
        <button
          className="a11y-btn"
          title="Toggle dark mode"
          onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
          aria-label="Toggle dark mode"
        >{state.darkMode ? '☀️' : '🌙'}</button>
      </div>
    </div>
  );
}
