import { stateStore } from '../state.js';
import { t } from '../utils/translations.js';
import { tts } from '../audio/tts.js';
import { api } from '../api.js';

export const languagesList = [
  {
    code: 'ml',
    name: 'Malayalam',
    native: 'മലയാളം',
    subtext: 'കേരളത്തിലെ സർക്കാർ, ബാങ്കിംഗ് സേവനങ്ങൾക്ക്',
    welcomeGreeting: 'നമസ്കാരം! സ്പീക്ക് 2 ഫില്ലിലേക്ക് സ്വാഗതം. സംസാരിച്ച് ഫോം പൂരിപ്പിക്കാം.'
  },
  {
    code: 'hi',
    name: 'Hindi',
    native: 'हिन्दी',
    subtext: 'राष्ट्रीय एवं राज्य स्तरीय फॉर्म आसानी से भरें',
    welcomeGreeting: 'नमस्ते! स्पीक 2 फिल में आपका स्वागत है। बोलकर फॉर्म भरें।'
  },
  {
    code: 'ta',
    name: 'Tamil',
    native: 'தமிழ்',
    subtext: 'அரசு மற்றும் வங்கி விண்ணப்பங்களுக்கு',
    welcomeGreeting: 'வணக்கம்! ஸ்பீக் 2 ஃபில்லுக்கு நல்வரவு. பேசிப் படிவம் நிரப்பலாம்.'
  },
  {
    code: 'te',
    name: 'Telugu',
    native: 'తెలుగు',
    subtext: 'ప్రభుత్వ పథకాలు మరియు బ్యాంక్ దరఖాస్తులకు',
    welcomeGreeting: 'నమస్కారం! స్పీక్ 2 ఫిల్ కు స్వాగతం. మాట్లాడి దరఖాస్తు నింపండి.'
  },
  {
    code: 'en',
    name: 'English',
    native: 'English',
    subtext: 'Simple voice-guided official applications',
    welcomeGreeting: 'Welcome to Speak 2 Fill. Simple voice-guided forms for everyone.'
  }
];

export async function renderLanguageSelectScreen(container) {
  const state = stateStore.get();
  const lang = state.language;

  // Check if user has an active resumable session
  let resumableSession = null;
  const savedSessionId = localStorage.getItem('s2f_active_session_id');
  if (savedSessionId) {
    try {
      const data = await api.getSession(savedSessionId);
      if (data && data.session && data.session.status === 'in_progress') {
        resumableSession = data.session;
      }
    } catch (e) {}
  }

  container.innerHTML = `
    <div class="screen-container animate-fade-in">
      <div class="welcome-hero text-center">
        <div class="brand-badge-pill">
          <span class="icon">🎙️</span>
          <span>Assistive Voice Form Filler</span>
        </div>
        <h1 class="hero-title" id="dyn-hero-title">${t('appName', lang)}</h1>
        <p class="hero-tagline" id="dyn-hero-tagline">${t('tagline', lang)}</p>
        <p class="hero-reassurance" id="dyn-hero-reassurance">
          ${t('greeting', lang)}
        </p>
      </div>

      ${resumableSession ? `
        <div class="resume-alert-card animate-slide-up">
          <div class="resume-info">
            <span class="pulse-indicator"></span>
            <div>
              <div class="resume-badge">${t('resumePrevious', lang)}</div>
              <h3 class="resume-form-title">${resumableSession.templateName || 'Application Form'}</h3>
              <p class="resume-progress-text">${resumableSession.progress}% completed • Field ${resumableSession.currentFieldIndex + 1} of ${resumableSession.totalFields}</p>
            </div>
          </div>
          <button id="btn-quick-resume" class="btn btn-accent btn-large" data-session-id="${resumableSession._id}">
            <span>▶️</span> ${t('resumeButton', lang)}
          </button>
        </div>
      ` : ''}

      <div class="language-selection-section">
        <h2 class="section-title text-center" id="dyn-section-title">${t('selectLanguage', lang)}</h2>
        <p class="section-sub text-center" id="dyn-section-sub">${t('selectLanguageSub', lang)}</p>

        <div class="language-grid">
          ${languagesList.map(item => `
            <div class="language-card ${item.code === lang ? 'active' : ''}" data-lang="${item.code}" role="button" tabindex="0">
              <div class="lang-native-script">${item.native}</div>
              <div class="lang-english-label">${item.name}</div>
              <div class="lang-subtext">${item.subtext}</div>
              <div class="lang-audio-badge" id="badge-${item.code}">
                <span class="sound-wave-icon">🔊</span>
                <span class="badge-label-text">Tap to play voice</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="action-footer text-center">
        <button id="btn-continue-upload" class="btn btn-primary btn-xl">
          <span id="dyn-get-started">${t('getStarted', lang)}</span>
          <span class="arrow-icon">→</span>
        </button>
      </div>

      <div class="trust-footer">
        <div class="trust-badge">
          <span class="trust-icon">🔒</span>
          <span id="dyn-privacy-note">${t('privacyNote', lang)}</span>
        </div>
      </div>
    </div>
  `;

  // Attach event handlers
  const langCards = container.querySelectorAll('.language-card');

  function updateTexts(newLang) {
    const titleEl = container.querySelector('#dyn-hero-title');
    const taglineEl = container.querySelector('#dyn-hero-tagline');
    const reassureEl = container.querySelector('#dyn-hero-reassurance');
    const secTitleEl = container.querySelector('#dyn-section-title');
    const secSubEl = container.querySelector('#dyn-section-sub');
    const startEl = container.querySelector('#dyn-get-started');
    const privEl = container.querySelector('#dyn-privacy-note');

    if (titleEl) titleEl.innerText = t('appName', newLang);
    if (taglineEl) taglineEl.innerText = t('tagline', newLang);
    if (reassureEl) reassureEl.innerText = t('greeting', newLang);
    if (secTitleEl) secTitleEl.innerText = t('selectLanguage', newLang);
    if (secSubEl) secSubEl.innerText = t('selectLanguageSub', newLang);
    if (startEl) startEl.innerText = t('getStarted', newLang);
    if (privEl) privEl.innerText = t('privacyNote', newLang);
  }

  function resetAllBadges() {
    languagesList.forEach(item => {
      const badge = container.querySelector(`#badge-${item.code}`);
      if (badge) {
        badge.classList.remove('playing');
        badge.innerHTML = `<span class="sound-wave-icon">🔊</span> <span class="badge-label-text">Tap to play voice</span>`;
      }
    });
  }

  langCards.forEach(card => {
    card.addEventListener('click', () => {
      const selectedLang = card.getAttribute('data-lang');
      const langObj = languagesList.find(l => l.code === selectedLang);

      // 1. Update UI highlight without tearing down DOM
      langCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      // 2. Set active state
      stateStore.set({ language: selectedLang });
      updateTexts(selectedLang);

      // 3. Visual feedback on audio badge
      resetAllBadges();
      const activeBadge = card.querySelector('.lang-audio-badge');
      if (activeBadge) {
        activeBadge.classList.add('playing');
        activeBadge.innerHTML = `<span class="sound-wave-icon animate-pulse">🔊</span> <span class="badge-label-text">Playing voice...</span>`;
      }

      // 4. Play voice greeting in selected language
      tts.playChime('click');
      if (langObj) {
        tts.speak(langObj.welcomeGreeting, selectedLang).then(() => {
          resetAllBadges();
        });
      }
    });
  });

  const continueBtn = container.querySelector('#btn-continue-upload');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      tts.stop();
      tts.playChime('click');
      stateStore.set({ currentScreen: 'upload' });
    });
  }

  const resumeBtn = container.querySelector('#btn-quick-resume');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', async () => {
      tts.stop();
      tts.playChime('click');
      const sid = resumeBtn.getAttribute('data-session-id');
      try {
        const data = await api.getSession(sid);
        stateStore.set({
          activeSession: data.session,
          activeTemplate: data.template,
          currentFieldIndex: data.session.currentFieldIndex || 0,
          language: data.session.language || state.language,
          currentScreen: 'voice'
        });
      } catch (err) {
        alert('Could not resume session: ' + err.message);
      }
    });
  }
}
