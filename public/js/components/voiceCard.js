import { stateStore } from '../state.js';
import { t } from '../utils/translations.js';
import { api } from '../api.js';
import { tts } from '../audio/tts.js';
import { AudioRecorder } from '../audio/recorder.js';
import { validateAndNormalize } from '../utils/validators.js';

let audioRecorder = null;
let currentRecordedBlob = null;
let hasAutoPrompted = false;

export function renderVoiceCardScreen(container) {
  const state = stateStore.get();
  const session = state.activeSession;
  const template = state.activeTemplate;
  const lang = state.language;

  if (!template || !template.fields || template.fields.length === 0) {
    container.innerHTML = `
      <div class="screen-container text-center">
        <h2>No fields found in this form.</h2>
        <button class="btn btn-primary" onclick="window.location.reload()">Back to Home</button>
      </div>
    `;
    return;
  }

  const fields = template.fields;
  const currentIndex = state.currentFieldIndex < fields.length ? state.currentFieldIndex : fields.length - 1;
  const currentField = fields[currentIndex];

  // Retrieve saved answer if any
  const savedAnswer = session?.answers?.[currentField.id] || (session?.answers && session.answers instanceof Map ? session.answers.get(currentField.id) : null);
  const currentAnswerValue = savedAnswer ? savedAnswer.displayValue || savedAnswer.value : '';

  const progressPercent = Math.round(((currentIndex) / fields.length) * 100);

  // Determine localized voice prompt question
  let promptText = currentField.helpPrompts?.[lang] || currentField.helpPrompts?.en || `What is your ${currentField.label}?`;
  if (!promptText && lang === 'ml') {
    promptText = `നിങ്ങളുടെ ${currentField.label} എന്താണ്?`;
  }

  container.innerHTML = `
    <div class="screen-container voice-screen animate-fade-in">
      <!-- Top Navigation & Progress Header -->
      <div class="voice-header">
        <div class="form-title-bar">
          <button id="btn-exit-to-home" class="btn-icon" title="Save and Exit">
            <span>✕</span>
          </button>
          <div class="form-meta">
            <span class="form-name-badge">${template.name}</span>
            <span class="step-indicator">${t('fieldStep', lang, { current: currentIndex + 1, total: fields.length })}</span>
          </div>
        </div>

        <!-- Live Progress Bar -->
        <div class="progress-bar-wrapper">
          <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <!-- Single Focus Voice Card -->
      <div class="voice-card animate-slide-up">
        <!-- Field Type Badge & Question -->
        <div class="card-field-header">
          <span class="field-type-pill">
            ${getFieldTypeIcon(currentField.type)} ${currentField.type.toUpperCase()}
          </span>
          ${currentField.required ? `<span class="required-pill">• Required</span>` : `<span class="optional-pill">• Optional</span>`}
        </div>

        <div class="card-prompt-area">
          <h2 class="field-label-text">${currentField.label}</h2>
          <p class="field-voice-prompt">${promptText}</p>
        </div>

        <!-- Repeat Question TTS Trigger -->
        <div class="repeat-prompt-action">
          <button id="btn-repeat-prompt" class="btn btn-ghost btn-sm">
            <span class="speaker-icon">🔊</span>
            <span>${t('repeatPrompt', lang)}</span>
          </button>
        </div>

        <!-- Central Voice Visualizer & Mic Area -->
        <div class="voice-central-hub">
          <!-- Multi-sensory Status Pill -->
          <div id="voice-status-pill" class="status-pill status-idle">
            <span class="status-dot"></span>
            <span id="voice-status-text" class="status-text">${t('speakNow', lang)}</span>
          </div>

          <!-- Waveform Canvas -->
          <div class="visualizer-wrapper">
            <canvas id="waveform-canvas" width="340" height="70"></canvas>
          </div>

          <!-- Big Accessible 68px Mic Button -->
          <div class="mic-button-wrapper">
            <button id="btn-main-mic" class="btn-mic-accessible" aria-label="Tap to speak your answer">
              <div class="mic-pulsing-rings"></div>
              <span class="mic-inner-icon">🎙️</span>
            </button>
            <span class="mic-label-instruction">Tap microphone to speak</span>
          </div>
        </div>

        <!-- Live Transcript & Confirmation Bubble -->
        <div id="transcript-confirmation-card" class="transcript-card ${currentAnswerValue ? '' : 'hidden'}">
          <div class="transcript-header">
            <span class="transcript-badge">Recognized Answer:</span>
            <span id="format-validation-badge" class="badge-valid">✓ Format Valid</span>
          </div>

          <div class="transcript-body">
            <div id="transcript-text" class="transcript-content">
              "${currentAnswerValue || ''}"
            </div>
            <p id="confirm-question-text" class="confirm-query-text">
              ${t('confirmationQuestion', lang, { value: currentAnswerValue || '' })}
            </p>
          </div>

          <!-- Confirmation Buttons -->
          <div class="confirmation-actions">
            <button id="btn-confirm-next" class="btn btn-accent btn-large">
              <span>✅</span>
              <span>${t('yesConfirm', lang)}</span>
            </button>
            <button id="btn-retry-speak" class="btn btn-secondary btn-large">
              <span>🔄</span>
              <span>${t('retrySpeak', lang)}</span>
            </button>
          </div>
        </div>

        <!-- Secondary Actions (Type instead, skip field, previous) -->
        <div class="card-bottom-actions">
          <button id="btn-prev-field" class="btn btn-text ${currentIndex === 0 ? 'disabled' : ''}">
            <span>←</span> Previous
          </button>

          <button id="btn-type-instead" class="btn btn-text">
            <span>⌨️</span> ${t('typeInstead', lang)}
          </button>

          <button id="btn-skip-field" class="btn btn-text">
            <span>⏭️</span> ${t('skipField', lang)}
          </button>
        </div>
      </div>

      <!-- Type Instead Fallback Modal -->
      <div id="manual-type-modal" class="modal-overlay hidden">
        <div class="modal-card">
          <h3 class="modal-title">Type Your Answer</h3>
          <p class="modal-sub">For: ${currentField.label}</p>
          <div class="form-group">
            <input id="manual-input-field" type="${currentField.type === 'number' ? 'number' : 'text'}"
              placeholder="${currentField.placeholder || 'Enter value...'}"
              value="${currentAnswerValue || ''}"
              class="form-control-large">
          </div>
          <div class="modal-actions">
            <button id="btn-close-modal" class="btn btn-secondary">Cancel</button>
            <button id="btn-save-manual-input" class="btn btn-primary">Save &amp; Continue</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize or grab elements
  const micBtn = container.querySelector('#btn-main-mic');
  const repeatBtn = container.querySelector('#btn-repeat-prompt');
  const confirmBtn = container.querySelector('#btn-confirm-next');
  const retryBtn = container.querySelector('#btn-retry-speak');
  const skipBtn = container.querySelector('#btn-skip-field');
  const prevBtn = container.querySelector('#btn-prev-field');
  const typeInsteadBtn = container.querySelector('#btn-type-instead');
  const exitBtn = container.querySelector('#btn-exit-to-home');
  const canvas = container.querySelector('#waveform-canvas');
  const statusPill = container.querySelector('#voice-status-pill');
  const statusText = container.querySelector('#voice-status-text');
  const transcriptCard = container.querySelector('#transcript-confirmation-card');
  const transcriptText = container.querySelector('#transcript-text');
  const confirmQueryText = container.querySelector('#confirm-question-text');
  const validationBadge = container.querySelector('#format-validation-badge');
  const manualModal = container.querySelector('#manual-type-modal');
  const manualInput = container.querySelector('#manual-input-field');
  const saveManualBtn = container.querySelector('#btn-save-manual-input');
  const closeModalBtn = container.querySelector('#btn-close-modal');

  if (!audioRecorder) {
    audioRecorder = new AudioRecorder();
  }

  // Speak field prompt aloud automatically if first time on this field
  function speakFieldPrompt() {
    tts.playChime('start');
    statusPill.className = 'status-pill status-prompting';
    statusText.innerText = '🔊 Reading question aloud...';
    tts.speak(promptText, lang).then(() => {
      statusPill.className = 'status-pill status-idle';
      statusText.innerText = t('speakNow', lang);
    });
  }

  speakFieldPrompt();

  repeatBtn.addEventListener('click', () => {
    speakFieldPrompt();
  });

  // Toggle Microphone recording
  async function toggleRecording() {
    if (!audioRecorder.isRecording) {
      // START RECORDING
      try {
        tts.stop();
        tts.playChime('click');
        micBtn.classList.add('recording-active');
        statusPill.className = 'status-pill status-listening animate-pulse';
        statusText.innerText = t('listening', lang);

        await audioRecorder.startRecording(canvas, lang, (interimText) => {
          transcriptCard.classList.remove('hidden');
          transcriptText.innerText = `"${interimText}..."`;
        });
      } catch (err) {
        alert('Could not access microphone: ' + err.message);
        micBtn.classList.remove('recording-active');
        statusPill.className = 'status-pill status-idle';
        statusText.innerText = 'Microphone access failed. Try typing instead.';
      }
    } else {
      // STOP RECORDING & TRANSCRIBE
      micBtn.classList.remove('recording-active');
      statusPill.className = 'status-pill status-processing';
      statusText.innerText = t('processingVoice', lang);

      const { blob, clientTranscript } = await audioRecorder.stopRecording();
      currentRecordedBlob = blob;

      try {
        // Send to backend Sarvam STT proxy
        const result = await api.transcribeAudioBlob(blob, lang, clientTranscript);
        const recognized = result.transcript || clientTranscript;

        if (!recognized || recognized.trim().length === 0) {
          statusPill.className = 'status-pill status-idle';
          statusText.innerText = 'Could not catch that clearly. Please try again.';
          tts.speak(lang === 'ml' ? 'വ്യക്തമായില്ല, ദയവായി ഒന്നുകൂടി പറയൂ.' : 'Could not catch that, please speak again.', lang);
          return;
        }

        handleAnswerRecognized(recognized);
      } catch (err) {
        console.error('Transcription error:', err);
        if (clientTranscript) {
          handleAnswerRecognized(clientTranscript);
        } else {
          statusPill.className = 'status-pill status-idle';
          statusText.innerText = 'Audio recognition error. You can also type instead.';
        }
      }
    }
  }

  micBtn.addEventListener('click', toggleRecording);

  function handleAnswerRecognized(rawText) {
    const validated = validateAndNormalize(rawText, currentField.type, lang);
    stateStore.set({ currentValue: validated.value });

    transcriptCard.classList.remove('hidden');
    transcriptText.innerText = `"${validated.displayValue}"`;
    confirmQueryText.innerText = t('confirmationQuestion', lang, { value: validated.displayValue });

    if (validated.valid) {
      validationBadge.className = 'badge-valid';
      validationBadge.innerText = `✓ ${validated.message || t('validInput', lang)}`;
    } else {
      validationBadge.className = 'badge-warning';
      validationBadge.innerText = `⚠️ ${validated.message || t('invalidInput', lang)}`;
    }

    statusPill.className = 'status-pill status-confirming';
    statusText.innerText = t('gotIt', lang);

    // Speak confirmation prompt aloud
    const confirmPrompt = lang === 'ml'
      ? `നിങ്ങൾ പറഞ്ഞത് ${validated.displayValue}. ഇത് ശരിയാണോ?`
      : `You said ${validated.displayValue}. Is that correct?`;

    tts.speak(confirmPrompt, lang);
  }

  // Confirm Answer & Advance to next field
  confirmBtn.addEventListener('click', async () => {
    tts.stop();
    tts.playChime('success');

    const stateNow = stateStore.get();
    const val = stateNow.currentValue || transcriptText.innerText.replace(/"/g, '');

    try {
      const updateRes = await api.saveFieldAnswer(session._id, currentField.id, {
        value: val,
        displayValue: val,
        confirmed: true,
        skipped: false,
        fieldLabel: currentField.label
      });

      // Update session in state
      stateStore.set({
        activeSession: updateRes.session,
        currentValue: ''
      });

      if (updateRes.isFullyCompleted || currentIndex >= fields.length - 1) {
        // Form is completed! Advance to visual review summary screen
        stateStore.set({ currentScreen: 'review' });
      } else {
        // Move to next field
        stateStore.set({ currentFieldIndex: currentIndex + 1 });
        renderVoiceCardScreen(container);
      }
    } catch (err) {
      alert('Failed to save answer: ' + err.message);
    }
  });

  // Retry voice answer
  retryBtn.addEventListener('click', () => {
    tts.stop();
    transcriptCard.classList.add('hidden');
    stateStore.set({ currentValue: '' });
    toggleRecording();
  });

  // Skip this field
  skipBtn.addEventListener('click', async () => {
    tts.stop();
    tts.playChime('click');

    try {
      const updateRes = await api.saveFieldAnswer(session._id, currentField.id, {
        value: '',
        displayValue: '[Skipped]',
        confirmed: false,
        skipped: true,
        fieldLabel: currentField.label
      });

      stateStore.set({ activeSession: updateRes.session });

      if (currentIndex >= fields.length - 1) {
        stateStore.set({ currentScreen: 'review' });
      } else {
        stateStore.set({ currentFieldIndex: currentIndex + 1 });
        renderVoiceCardScreen(container);
      }
    } catch (e) {
      console.warn('Skip error:', e);
    }
  });

  // Previous Field
  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      tts.stop();
      tts.playChime('click');
      stateStore.set({ currentFieldIndex: currentIndex - 1 });
      renderVoiceCardScreen(container);
    }
  });

  // Type Instead Modal
  typeInsteadBtn.addEventListener('click', () => {
    tts.stop();
    manualModal.classList.remove('hidden');
    manualInput.focus();
  });

  closeModalBtn.addEventListener('click', () => {
    manualModal.classList.add('hidden');
  });

  saveManualBtn.addEventListener('click', () => {
    const val = manualInput.value.trim();
    if (val) {
      handleAnswerRecognized(val);
      manualModal.classList.add('hidden');
    }
  });

  // Save and exit to home
  exitBtn.addEventListener('click', () => {
    tts.stop();
    stateStore.set({ currentScreen: 'language' });
  });
}

function getFieldTypeIcon(type) {
  switch (type) {
    case 'number': return '🔢';
    case 'phone': return '📞';
    case 'date': return '📅';
    case 'checkbox': return '☑️';
    case 'signature': return '✍️';
    default: return '📝';
  }
}
