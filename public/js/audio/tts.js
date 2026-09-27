import { api } from '../api.js';

/**
 * Text-to-Speech Controller for Speak2Fill.
 * Plays high-fidelity Indic neural audio or Sarvam AI speech,
 * with Web Audio API earcon chimes.
 */
class TTSController {
  constructor() {
    this.currentAudio = null;
    this.audioCtx = null;
    this.onStatusChange = null;
  }

  _getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Play a gentle reassuring audio chime
   */
  playChime(type = 'start') {
    try {
      const ctx = this._getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {}
  }

  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (this.onStatusChange) {
      this.onStatusChange(false);
    }
  }

  /**
   * Speak a text prompt aloud in the specified language (ml, hi, ta, te, en)
   * Guaranteed to work across all browsers via neural Indic audio synthesis.
   */
  async speak(text, language = 'en') {
    this.stop();
    if (!text || text.trim().length === 0) return false;

    if (this.onStatusChange) {
      this.onStatusChange(true);
    }

    try {
      // 1. Fetch real synthesized audio from backend (Sarvam or Indic neural generator)
      const response = await api.synthesizeSpeech(text, language);

      if (response && response.audioBase64) {
        return new Promise((resolve) => {
          const mime = response.mimeType || 'audio/mpeg';
          const audio = new Audio(`data:${mime};base64,${response.audioBase64}`);
          this.currentAudio = audio;

          audio.onended = () => {
            this.currentAudio = null;
            if (this.onStatusChange) this.onStatusChange(false);
            resolve(true);
          };

          audio.onerror = (err) => {
            console.warn('Audio tag playback error:', err);
            this.currentAudio = null;
            this._speakViaWebSpeech(text, language).then(resolve);
          };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn('Audio play was prevented or failed:', err);
              this._speakViaWebSpeech(text, language).then(resolve);
            });
          }
        });
      }

      // 2. Client Web Speech API fallback
      return await this._speakViaWebSpeech(text, language);
    } catch (err) {
      console.warn('Server TTS route error, using browser speech:', err.message);
      return await this._speakViaWebSpeech(text, language);
    }
  }

  _speakViaWebSpeech(text, language) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        if (this.onStatusChange) this.onStatusChange(false);
        return resolve(false);
      }

      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const langMap = {
          ml: 'ml-IN',
          hi: 'hi-IN',
          ta: 'ta-IN',
          te: 'te-IN',
          en: 'en-IN'
        };
        utterance.lang = langMap[language] || 'en-IN';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang.startsWith(utterance.lang) || v.lang.includes(language));
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => {
          if (this.onStatusChange) this.onStatusChange(false);
          resolve(true);
        };
        utterance.onerror = () => {
          if (this.onStatusChange) this.onStatusChange(false);
          resolve(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        if (this.onStatusChange) this.onStatusChange(false);
        resolve(false);
      }
    });
  }
}

export const tts = new TTSController();
