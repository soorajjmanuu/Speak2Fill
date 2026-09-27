import { stateStore } from '../state.js';
import { t } from '../utils/translations.js';
import { api } from '../api.js';
import { tts } from '../audio/tts.js';

export function renderReviewOverlayScreen(container) {
  const state = stateStore.get();
  const session = state.activeSession;
  const template = state.activeTemplate;
  const lang = state.language;

  if (!template || !session) {
    container.innerHTML = `
      <div class="screen-container text-center">
        <h2>No completed session to display.</h2>
        <button class="btn btn-primary" onclick="window.location.reload()">Start Over</button>
      </div>
    `;
    return;
  }

  const fields = template.fields || [];
  let answers = session.answers || {};
  if (answers instanceof Map) {
    answers = Object.fromEntries(answers);
  }

  const answeredFieldsList = fields.map(field => {
    const ans = answers[field.id];
    return {
      field,
      answer: ans ? ans.displayValue || ans.value : '[Not filled]',
      isConfirmed: ans ? ans.confirmed : false,
      isSkipped: ans ? ans.skipped : true
    };
  });

  tts.playChime('success');

  container.innerHTML = `
    <div class="screen-container review-screen animate-fade-in">
      <!-- Header -->
      <div class="review-header text-center">
        <div class="celebration-badge">
          <span>🎉</span> 100% Filled &amp; Verified
        </div>
        <h1 class="screen-title">${t('summaryTitle', lang)}</h1>
        <p class="screen-sub">${t('summarySub', lang)}</p>
      </div>

      <!-- Action Toolbar -->
      <div class="review-toolbar">
        <button id="btn-print-form" class="btn btn-secondary btn-large">
          <span>🖨️</span>
          <span>${t('printForm', lang)}</span>
        </button>

        <button id="btn-final-submit" class="btn btn-accent btn-large">
          <span>✅</span>
          <span>${t('submitForm', lang)}</span>
        </button>

        <button id="btn-fill-another" class="btn btn-outline btn-large">
          <span>➕</span>
          <span>${t('startNew', lang)}</span>
        </button>
      </div>

      <!-- Main Visual Form Preview with Overlaid Answers -->
      <div class="visual-form-card">
        <div class="visual-card-header">
          <div class="header-left">
            <span class="icon">📄</span>
            <h3>Original Document with Overlaid Voice Answers</h3>
          </div>
          <span class="badge-overlay-hint">Tapping any answer lets you re-edit</span>
        </div>

        <div class="form-canvas-container">
          <div class="form-canvas-relative" id="form-overlay-viewport">
            <!-- Background Form Image -->
            <img id="review-form-base-img" src="${template.imageUrl}" alt="${template.name}" class="review-base-image">

            <!-- Overlay Answers positioned according to Gemini field coordinates -->
            ${fields.map((f, idx) => {
              const ansObj = answers[f.id];
              const textVal = ansObj ? (ansObj.displayValue || ansObj.value) : '';
              if (!textVal) return '';

              const pos = f.position || { x: 30, y: 20 + idx * 8, width: 40, height: 4 };

              return `
                <div class="field-overlay-stamp"
                  style="left: ${pos.x}%; top: ${pos.y}%; width: ${Math.max(pos.width, 20)}%;"
                  data-field-index="${idx}"
                  title="Click to re-record ${f.label}">
                  <div class="stamp-pill">
                    <span class="stamp-icon">✍️</span>
                    <span class="stamp-text">${escapeHtml(textVal)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Detailed Answers Breakdown Table -->
      <div class="answers-breakdown-card">
        <h3 class="breakdown-title">Field-by-Field Breakdown</h3>
        <div class="table-responsive">
          <table class="answers-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Field Name</th>
                <th>Expected Format</th>
                <th>Spoken Answer</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${answeredFieldsList.map((item, index) => `
                <tr>
                  <td><strong>${index + 1}</strong></td>
                  <td>
                    <div class="table-field-label">${item.field.label}</div>
                    <div class="table-field-id">${item.field.id}</div>
                  </td>
                  <td><span class="format-pill">${item.field.expectedFormat || item.field.type}</span></td>
                  <td>
                    <div class="table-answer-val ${item.isSkipped ? 'text-muted' : 'text-bold'}">
                      ${escapeHtml(item.answer)}
                    </div>
                  </td>
                  <td>
                    ${item.isConfirmed ? `
                      <span class="badge-confirmed">✓ Confirmed</span>
                    ` : (item.isSkipped ? `
                      <span class="badge-skipped">⏭️ Skipped</span>
                    ` : `
                      <span class="badge-pending">Pending</span>
                    `)}
                  </td>
                  <td>
                    <button class="btn btn-ghost btn-sm btn-edit-field" data-index="${index}">
                      <span>✏️</span> Edit
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Submission Modal -->
      <div id="submission-success-modal" class="modal-overlay hidden">
        <div class="modal-card text-center animate-scale-up">
          <div class="modal-icon-circle">✅</div>
          <h2 class="modal-title">Form Submitted Successfully!</h2>
          <p class="modal-sub">Your voice-filled application for <strong>${template.name}</strong> has been saved and logged in the database.</p>
          <div class="modal-receipt-code">
            <span>Reference ID: <strong>S2F-${session._id.substring(session._id.length - 8).toUpperCase()}</strong></span>
          </div>
          <div class="modal-actions justify-center">
            <button id="btn-modal-print" class="btn btn-secondary">Print Receipt</button>
            <button id="btn-modal-done" class="btn btn-primary">Done / Home</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Handlers
  const printBtn = container.querySelector('#btn-print-form');
  const submitBtn = container.querySelector('#btn-final-submit');
  const newBtn = container.querySelector('#btn-fill-another');
  const editBtns = container.querySelectorAll('.btn-edit-field');
  const overlayStamps = container.querySelectorAll('.field-overlay-stamp');
  const modal = container.querySelector('#submission-success-modal');
  const modalPrint = container.querySelector('#btn-modal-print');
  const modalDone = container.querySelector('#btn-modal-done');

  printBtn.addEventListener('click', () => {
    window.print();
  });

  submitBtn.addEventListener('click', async () => {
    try {
      await api.completeSession(session._id);
      modal.classList.remove('hidden');
      tts.playChime('success');
      tts.speak(lang === 'ml' ? 'നിങ്ങളുടെ ഫോം വിജയകരമായി സമർപ്പിച്ചു!' : 'Your form has been submitted successfully!', lang);
    } catch (e) {
      alert('Failed to submit form: ' + e.message);
    }
  });

  newBtn.addEventListener('click', () => {
    stateStore.set({
      activeSession: null,
      activeTemplate: null,
      currentFieldIndex: 0,
      currentScreen: 'upload'
    });
  });

  editBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      stateStore.set({
        currentFieldIndex: idx,
        currentScreen: 'voice'
      });
    });
  });

  overlayStamps.forEach(stamp => {
    stamp.addEventListener('click', () => {
      const idx = parseInt(stamp.getAttribute('data-field-index'), 10);
      stateStore.set({
        currentFieldIndex: idx,
        currentScreen: 'voice'
      });
    });
  });

  modalPrint.addEventListener('click', () => {
    window.print();
  });

  modalDone.addEventListener('click', () => {
    stateStore.set({
      activeSession: null,
      activeTemplate: null,
      currentFieldIndex: 0,
      currentScreen: 'language'
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
