import { stateStore } from '../state.js';
import { t } from '../utils/translations.js';
import { api } from '../api.js';
import { tts } from '../audio/tts.js';

export function renderFormUploadScreen(container) {
  const state = stateStore.get();
  const lang = state.language;

  let selectedFile = null;
  let previewUrl = null;

  container.innerHTML = `
    <div class="screen-container animate-fade-in">
      <div class="screen-header">
        <button id="btn-back-to-lang" class="btn-text">
          <span class="icon">←</span> ${t('back', lang)}
        </button>
        <span class="step-pill">Step 1: Provide Form</span>
      </div>

      <div class="upload-hero text-center">
        <h1 class="screen-title">${t('uploadTitle', lang)}</h1>
        <p class="screen-sub">${t('uploadSub', lang)}</p>
      </div>

      <!-- Main Upload & Camera Zone -->
      <div class="upload-card">
        <div id="upload-dropzone" class="upload-dropzone">
          <div id="dropzone-empty-state" class="dropzone-content">
            <div class="upload-icon-circle">
              <span class="camera-icon">📷</span>
            </div>
            <h3 class="dropzone-heading">Capture or Choose Photo</h3>
            <p class="dropzone-sub">Supports photos from camera, JPG, PNG up to 15MB</p>

            <div class="upload-button-group">
              <!-- Capture directly via mobile camera -->
              <label class="btn btn-accent btn-large cursor-pointer">
                <span>📸</span>
                <span>${t('captureCamera', lang)}</span>
                <input id="camera-file-input" type="file" accept="image/*" capture="environment" class="hidden-input">
              </label>

              <!-- Pick from gallery / desktop -->
              <label class="btn btn-secondary btn-large cursor-pointer">
                <span>📁</span>
                <span>${t('chooseGallery', lang)}</span>
                <input id="gallery-file-input" type="file" accept="image/*" class="hidden-input">
              </label>
            </div>
          </div>

          <!-- Image Preview State -->
          <div id="dropzone-preview-state" class="dropzone-preview hidden">
            <div class="preview-image-wrapper">
              <img id="preview-image" src="" alt="Selected form preview">
              <div class="preview-overlay-tag">✓ Ready for Gemini AI detection</div>
            </div>
            <div class="preview-actions">
              <button id="btn-retake-image" class="btn btn-secondary">
                <span>🔄</span> Retake Photo
              </button>
              <button id="btn-analyze-image" class="btn btn-primary btn-large">
                <span>✨</span> Start AI Field Detection
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Preset Official Sample Forms for Instant Testing -->
      <div class="sample-templates-section">
        <div class="sample-section-header">
          <span class="badge-icon">⚡</span>
          <h3>${t('trySample', lang)}</h3>
        </div>

        <div class="sample-cards-grid">
          <!-- 1. Kerala Ration Card -->
          <div class="sample-card" data-template-id="template_kerala_ration">
            <div class="sample-card-badge bg-green">Civil Supplies • Kerala</div>
            <div class="sample-card-thumb">
              <img src="/assets/sample-forms/kerala-ration-card.svg" alt="Kerala Ration Card">
            </div>
            <div class="sample-card-body">
              <h4>${t('keralaRationCard', lang)}</h4>
              <p>7 fields • Head of family, Aadhaar, Income, Family members, Address</p>
              <button class="btn btn-outline btn-full">
                <span>👉</span> Quick Start
              </button>
            </div>
          </div>

          <!-- 2. SBI Account Opening -->
          <div class="sample-card" data-template-id="template_sbi_account">
            <div class="sample-card-badge bg-blue">State Bank of India</div>
            <div class="sample-card-thumb">
              <img src="/assets/sample-forms/sbi-account-form.svg" alt="SBI Form">
            </div>
            <div class="sample-card-body">
              <h4>${t('sbiBankAccount', lang)}</h4>
              <p>6 fields • Full name, DOB, PAN card, Monthly income, Nominee details</p>
              <button class="btn btn-outline btn-full">
                <span>👉</span> Quick Start
              </button>
            </div>
          </div>

          <!-- 3. School Admission -->
          <div class="sample-card" data-template-id="template_school_admission">
            <div class="sample-card-badge bg-teal">Education Dept</div>
            <div class="sample-card-thumb">
              <img src="/assets/sample-forms/school-admission-form.svg" alt="School Form">
            </div>
            <div class="sample-card-body">
              <h4>${t('schoolAdmission', lang)}</h4>
              <p>5 fields • Student name, Admission grade, Mother tongue, Guardian mobile</p>
              <button class="btn btn-outline btn-full">
                <span>👉</span> Quick Start
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Trust Assurance -->
      <div class="trust-footer">
        <div class="trust-badge">
          <span>🛡️</span>
          <span>${t('privacyNote', lang)}</span>
        </div>
      </div>
    </div>
  `;

  // DOM Elements
  const emptyState = container.querySelector('#dropzone-empty-state');
  const previewState = container.querySelector('#dropzone-preview-state');
  const previewImg = container.querySelector('#preview-image');
  const cameraInput = container.querySelector('#camera-file-input');
  const galleryInput = container.querySelector('#gallery-file-input');
  const retakeBtn = container.querySelector('#btn-retake-image');
  const analyzeBtn = container.querySelector('#btn-analyze-image');
  const backBtn = container.querySelector('#btn-back-to-lang');

  // Handle file selection
  function handleFileSelected(file) {
    if (!file) return;
    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
    previewImg.src = previewUrl;

    emptyState.classList.add('hidden');
    previewState.classList.remove('hidden');
    tts.playChime('click');
  }

  cameraInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  galleryInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  retakeBtn.addEventListener('click', () => {
    selectedFile = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewState.classList.add('hidden');
    emptyState.classList.remove('hidden');
    cameraInput.value = '';
    galleryInput.value = '';
  });

  backBtn.addEventListener('click', () => {
    tts.playChime('click');
    stateStore.set({ currentScreen: 'language' });
  });

  // Start Gemini Detection on uploaded file
  analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    stateStore.set({ currentScreen: 'detecting' });

    try {
      const uploadResult = await api.uploadFormImage(selectedFile);
      const template = uploadResult.template;

      // Create new FillSession in MongoDB
      const sessionResult = await api.createSession(template._id, state.language, state.userId);

      stateStore.set({
        activeTemplate: template,
        activeSession: sessionResult.session,
        currentFieldIndex: 0,
        currentScreen: 'voice'
      });
    } catch (err) {
      console.error('Detection error:', err);
      alert('Failed to detect form fields: ' + err.message);
      stateStore.set({ currentScreen: 'upload' });
    }
  });

  // Sample card quick starts
  const sampleCards = container.querySelectorAll('.sample-card');
  sampleCards.forEach(card => {
    card.addEventListener('click', async () => {
      const templateId = card.getAttribute('data-template-id');
      stateStore.set({ currentScreen: 'detecting' });

      try {
        const uploadResult = await api.selectSampleTemplate(templateId);
        const template = uploadResult.template;

        const sessionResult = await api.createSession(template._id, state.language, state.userId);

        stateStore.set({
          activeTemplate: template,
          activeSession: sessionResult.session,
          currentFieldIndex: 0,
          currentScreen: 'voice'
        });
      } catch (err) {
        alert('Could not start sample session: ' + err.message);
        stateStore.set({ currentScreen: 'upload' });
      }
    });
  });
}

/**
 * Animated Loading Screen for Gemini AI Field Detection
 */
export function renderDetectingScreen(container) {
  const state = stateStore.get();
  const lang = state.language;

  container.innerHTML = `
    <div class="screen-container detecting-screen animate-fade-in text-center">
      <div class="detecting-box">
        <div class="scanner-visual">
          <div class="scanner-paper">
            <div class="scanner-line"></div>
            <div class="mock-fields">
              <div class="mock-line pulse-1"></div>
              <div class="mock-box pulse-2"></div>
              <div class="mock-line pulse-3"></div>
              <div class="mock-box pulse-1"></div>
            </div>
          </div>
        </div>

        <h2 class="detecting-title">${t('detectingFields', lang)}</h2>
        <p class="detecting-sub">${t('geminiProcessing', lang)}</p>

        <div class="detecting-status-pills">
          <span class="detect-pill">✨ Google Gemini Vision</span>
          <span class="detect-pill">🔍 Identifying Input Boxes</span>
          <span class="detect-pill">🎙️ Preparing Localized Voice Prompts</span>
        </div>
      </div>
    </div>
  `;
}
