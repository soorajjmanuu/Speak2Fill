/**
 * Backend API Client for Speak2Fill.
 * Communicates with Express endpoints for forms, sessions, STT, and TTS.
 */
class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async getStatus() {
    const res = await fetch(`${this.baseUrl}/api/status`);
    return await res.json();
  }

  async uploadFormImage(file, formTitle = '') {
    const formData = new FormData();
    formData.append('image', file);
    if (formTitle) formData.append('formTitle', formTitle);

    const res = await fetch(`${this.baseUrl}/api/forms/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload form image');
    }
    return await res.json();
  }

  async selectSampleTemplate(sampleTemplateId) {
    const res = await fetch(`${this.baseUrl}/api/forms/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleTemplateId })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to load sample template');
    }
    return await res.json();
  }

  async getTemplates() {
    const res = await fetch(`${this.baseUrl}/api/forms/templates`);
    return await res.json();
  }

  async createSession(templateId, language, userId) {
    const res = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, language, userId })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create fill session');
    }
    return await res.json();
  }

  async getSession(sessionId) {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch session');
    }
    return await res.json();
  }

  async getSessions(userId) {
    const url = userId ? `${this.baseUrl}/api/sessions?userId=${encodeURIComponent(userId)}` : `${this.baseUrl}/api/sessions`;
    const res = await fetch(url);
    return await res.json();
  }

  async saveFieldAnswer(sessionId, fieldId, payload) {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/field/${fieldId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save field answer');
    }
    return await res.json();
  }

  async completeSession(sessionId) {
    const res = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/complete`, {
      method: 'POST'
    });
    return await res.json();
  }

  async transcribeAudioBlob(audioBlob, language, clientTranscriptFallback = '') {
    const formData = new FormData();
    if (audioBlob) {
      formData.append('audio', audioBlob, 'mic-recording.webm');
    }
    formData.append('language', language);
    if (clientTranscriptFallback) {
      formData.append('clientTranscriptFallback', clientTranscriptFallback);
    }

    const res = await fetch(`${this.baseUrl}/api/speech/transcribe`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to transcribe audio');
    }
    return await res.json();
  }

  async synthesizeSpeech(text, language) {
    const res = await fetch(`${this.baseUrl}/api/speech/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to synthesize speech');
    }
    return await res.json();
  }
}

export const api = new ApiClient();
