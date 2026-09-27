import { stateStore } from '../state.js';
import { t } from '../utils/translations.js';
import { api } from '../api.js';
import { tts } from '../audio/tts.js';

export async function renderSessionHistoryScreen(container) {
  const state = stateStore.get();
  const lang = state.language;

  container.innerHTML = `
    <div class="screen-container animate-fade-in">
      <div class="screen-header">
        <button id="btn-back-home" class="btn-text">
          <span class="icon">←</span> ${t('back', lang)}
        </button>
        <span class="step-pill">Saved Submissions &amp; Drafts</span>
      </div>

      <div class="history-hero text-center">
        <h1 class="screen-title">${t('historyTitle', lang)}</h1>
        <p class="screen-sub">All forms filled on this device are saved securely in MongoDB.</p>
      </div>

      <div id="history-list-wrapper" class="history-list">
        <div class="loading-spinner-wrapper text-center">
          <div class="spinner"></div>
          <p>Loading your saved sessions...</p>
        </div>
      </div>
    </div>
  `;

  const backBtn = container.querySelector('#btn-back-home');
  backBtn.addEventListener('click', () => {
    tts.playChime('click');
    stateStore.set({ currentScreen: 'language' });
  });

  const listWrapper = container.querySelector('#history-list-wrapper');

  try {
    const data = await api.getSessions(state.userId);
    const sessions = data.sessions || [];

    if (sessions.length === 0) {
      listWrapper.innerHTML = `
        <div class="empty-history-box text-center">
          <div class="empty-icon">📂</div>
          <h3>${t('noHistory', lang)}</h3>
          <p>Start a new application with voice guidance in seconds.</p>
          <button id="btn-start-first-form" class="btn btn-primary btn-large">
            <span>✨</span> Fill Your First Form
          </button>
        </div>
      `;

      const startBtn = listWrapper.querySelector('#btn-start-first-form');
      if (startBtn) {
        startBtn.addEventListener('click', () => {
          stateStore.set({ currentScreen: 'upload' });
        });
      }
      return;
    }

    listWrapper.innerHTML = `
      <div class="sessions-cards-grid">
        ${sessions.map(s => {
          const isDone = s.status === 'completed' || s.progress === 100;
          const dateStr = new Date(s.updatedAt || s.createdAt).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return `
            <div class="session-card ${isDone ? 'card-completed' : 'card-inprogress'}">
              <div class="session-card-header">
                <span class="session-status-badge ${isDone ? 'badge-done' : 'badge-draft'}">
                  ${isDone ? '✓ ' + t('completed', lang) : '⏳ ' + t('inProgress', lang)}
                </span>
                <span class="session-date">${dateStr}</span>
              </div>

              <h3 class="session-form-name">${s.templateName || 'Application Form'}</h3>

              <div class="session-progress-info">
                <div class="progress-bar-wrapper">
                  <div class="progress-bar-fill" style="width: ${s.progress || 0}%;"></div>
                </div>
                <div class="progress-stats">
                  <span>${s.progress || 0}% Complete</span>
                  <span>Field ${(s.currentFieldIndex || 0) + 1} of ${s.totalFields || 0}</span>
                </div>
              </div>

              <div class="session-card-actions">
                <button class="btn ${isDone ? 'btn-secondary' : 'btn-accent'} btn-full btn-open-session" data-id="${s._id}">
                  <span>${isDone ? '👁️ View Filled Form' : '▶️ Resume Voice Filling'}</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    const openBtns = listWrapper.querySelectorAll('.btn-open-session');
    openBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = btn.getAttribute('data-id');
        tts.playChime('click');
        try {
          const detail = await api.getSession(sid);
          const isDone = detail.session.status === 'completed' || detail.session.progress === 100;

          stateStore.set({
            activeSession: detail.session,
            activeTemplate: detail.template,
            currentFieldIndex: detail.session.currentFieldIndex || 0,
            language: detail.session.language || state.language,
            currentScreen: isDone ? 'review' : 'voice'
          });
        } catch (e) {
          alert('Could not open session: ' + e.message);
        }
      });
    });

  } catch (err) {
    listWrapper.innerHTML = `
      <div class="text-center text-danger">
        <p>Could not load sessions: ${err.message}</p>
        <button class="btn btn-secondary" onclick="renderSessionHistoryScreen(container)">Retry</button>
      </div>
    `;
  }
}
