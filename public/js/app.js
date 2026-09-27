import { stateStore } from './state.js';
import { renderLanguageSelectScreen } from './components/languageSelect.js';
import { renderFormUploadScreen, renderDetectingScreen } from './components/formUpload.js';
import { renderVoiceCardScreen } from './components/voiceCard.js';
import { renderReviewOverlayScreen } from './components/reviewOverlay.js';
import { renderSessionHistoryScreen } from './components/sessionHistory.js';
import { t } from './utils/translations.js';

class AppController {
  constructor() {
    this.appRoot = document.getElementById('app-main');
    this.headerElement = document.getElementById('app-header');
  }

  init() {
    console.log('🎙️ Speak2Fill Assistive Frontend initializing...');

    this._applyAccessibilitySettings();
    this._setupGlobalNavControls();

    let lastScreen = null;

    // Subscribe to state changes to switch screens
    stateStore.subscribe((state) => {
      this._applyAccessibilitySettings();
      if (state.currentScreen !== lastScreen) {
        lastScreen = state.currentScreen;
        this._renderCurrentScreen(state);
      }
      this._updateHeader(state);
    });

    // Initial render
    const initialState = stateStore.get();
    lastScreen = initialState.currentScreen;
    this._renderCurrentScreen(initialState);
    this._updateHeader(initialState);
  }

  _applyAccessibilitySettings() {
    const { textSize, darkMode } = stateStore.get();
    const body = document.body;

    // Apply dark/light theme
    if (darkMode) {
      body.classList.add('theme-dark');
    } else {
      body.classList.remove('theme-dark');
    }

    // Apply text size scaling
    body.classList.remove('text-size-normal', 'text-size-large', 'text-size-xlarge');
    body.classList.add(`text-size-${textSize}`);
  }

  _setupGlobalNavControls() {
    // Text size switcher buttons
    const btnTextNormal = document.getElementById('btn-text-normal');
    const btnTextLarge = document.getElementById('btn-text-large');
    const btnTextXLarge = document.getElementById('btn-text-xlarge');

    if (btnTextNormal) {
      btnTextNormal.addEventListener('click', () => stateStore.set({ textSize: 'normal' }));
    }
    if (btnTextLarge) {
      btnTextLarge.addEventListener('click', () => stateStore.set({ textSize: 'large' }));
    }
    if (btnTextXLarge) {
      btnTextXLarge.addEventListener('click', () => stateStore.set({ textSize: 'xlarge' }));
    }

    // Dark mode toggle
    const darkModeBtn = document.getElementById('btn-toggle-darkmode');
    if (darkModeBtn) {
      darkModeBtn.addEventListener('click', () => {
        const { darkMode } = stateStore.get();
        stateStore.set({ darkMode: !darkMode });
      });
    }

    // History button
    const historyBtn = document.getElementById('btn-nav-history');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        const { currentScreen } = stateStore.get();
        if (currentScreen === 'history') {
          stateStore.set({ currentScreen: 'language' });
        } else {
          stateStore.set({ currentScreen: 'history' });
        }
      });
    }

    // Brand logo returns to home
    const brandLogo = document.getElementById('nav-brand-logo');
    if (brandLogo) {
      brandLogo.addEventListener('click', () => {
        stateStore.set({ currentScreen: 'language' });
      });
    }
  }

  _updateHeader(state) {
    const lang = state.language;
    const langNames = {
      ml: 'മലയാളം',
      hi: 'हिन्दी',
      ta: 'தமிழ்',
      te: 'తెలుగు',
      en: 'English'
    };

    const langBadge = document.getElementById('header-lang-indicator');
    if (langBadge) {
      langBadge.innerText = langNames[lang] || 'English';
    }

    // Update active text size button state
    ['normal', 'large', 'xlarge'].forEach(size => {
      const el = document.getElementById(`btn-text-${size}`);
      if (el) {
        if (state.textSize === size) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });

    // Dark mode icon
    const darkBtn = document.getElementById('btn-toggle-darkmode');
    if (darkBtn) {
      darkBtn.innerHTML = state.darkMode ? '☀️ Light' : '🌙 Dark';
    }
  }

  _renderCurrentScreen(state) {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    switch (state.currentScreen) {
      case 'language':
        renderLanguageSelectScreen(this.appRoot);
        break;
      case 'upload':
        renderFormUploadScreen(this.appRoot);
        break;
      case 'detecting':
        renderDetectingScreen(this.appRoot);
        break;
      case 'voice':
        renderVoiceCardScreen(this.appRoot);
        break;
      case 'review':
        renderReviewOverlayScreen(this.appRoot);
        break;
      case 'history':
        renderSessionHistoryScreen(this.appRoot);
        break;
      default:
        renderLanguageSelectScreen(this.appRoot);
        break;
    }
  }
}

// Boot app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
