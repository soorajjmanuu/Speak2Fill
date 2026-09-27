/**
 * REST API client — communicates with Node.js Express backend.
 * No hardcoded fallbacks. Throws on error.
 */
class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async getStatus() {
    const res = await fetch(`${this.baseUrl}/api/status`);
    return await res.json();
  }

  // ── Form Templates ─────────────────────────────────────────────────────

  async uploadFormImage(file, onProgress) {
    const formData = new FormData();
    formData.append('image', file);

    // Simulate progress via a pseudo-timer (XHR needed for real progress)
    let pct = 0;
    const tick = setInterval(() => {
      pct = Math.min(pct + 12, 85);
      onProgress?.(pct);
    }, 400);

    let data;
    try {
      const res = await fetch(`${this.baseUrl}/api/forms/upload`, {
        method: 'POST',
        body: formData,
      });
      clearInterval(tick);
      onProgress?.(100);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to analyze form with OpenAI.');
      }
      data = await res.json();
    } catch (err) {
      clearInterval(tick);
      throw err;
    }
    return data;
  }

  async selectSampleTemplate(sampleTemplateId) {
    const res = await fetch(`${this.baseUrl}/api/forms/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleTemplateId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to load form template');
    }
    return await res.json();
  }

  async getTemplates() {
    const res = await fetch(`${this.baseUrl}/api/forms/templates`);
    return await res.json();
  }

  async getTemplate(templateId) {
    const res = await fetch(`${this.baseUrl}/api/forms/templates/${templateId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to fetch template');
    }
    return await res.json();
  }

  // ── Sessions ───────────────────────────────────────────────────────────

  /**
   * @param {string} templateId
   * @param {string} userId
   * @param {string} language
   */
  async createSession(templateId, userId, language) {
    const res = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, userId, language }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to start session');
    }
    return await res.json();
  }

  async getSession(sessionId) {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to fetch session');
    }
    return await res.json();
  }

  async getSessions(userId) {
    const url = userId
      ? `${this.baseUrl}/api/sessions?userId=${encodeURIComponent(userId)}`
      : `${this.baseUrl}/api/sessions`;
    const res = await fetch(url);
    return await res.json();
  }

  /**
   * Save / update a single field answer.
   * @param {string} sessionId
   * @param {Object} payload - { fieldId, fieldLabel, answer, inputMethod }
   */
  async saveFieldAnswer(sessionId, payload) {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to save field answer');
    }
    return await res.json();
  }

  async completeSession(sessionId) {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
    return await res.json();
  }

  // ── Speech ─────────────────────────────────────────────────────────────

  /**
   * Sarvam STT — transcribe recorded audio blob.
   * @param {Blob} audioBlob
   * @param {string} language - e.g. 'ml-IN'
   */
  async transcribeAudioBlob(audioBlob, language) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'mic-recording.webm');
    formData.append('language', language);

    const res = await fetch(`${this.baseUrl}/api/speech/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to transcribe with Sarvam STT');
    }
    return await res.json();
  }

  /**
   * Sarvam TTS — synthesize text to audio.
   * @param {string} text
   * @param {string} language - e.g. 'ml'
   * @returns {{ audioData: string, mimeType: string }}
   */
  async synthesizeSpeech(text, language) {
    const res = await fetch(`${this.baseUrl}/api/speech/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to synthesize with Sarvam TTS');
    }
    return await res.json();
  }
}

export const api = new ApiClient();
