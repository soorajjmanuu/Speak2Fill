import { api } from './api';

let activeAudio = null;
let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function playChime(type = 'start') {
  try {
    const ctx = getAudioContext();
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

export function stopAudioPlayback() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch (e) {}
    activeAudio = null;
  }
}

/**
 * Play synthesized speech from Sarvam TTS
 */
export async function playTTS(text, language = 'en', onStart = null, onEnd = null) {
  stopAudioPlayback();
  if (!text || text.trim().length === 0) return false;

  if (onStart) onStart();

  try {
    const res = await api.synthesizeSpeech(text, language);
    if (!res || !res.audioBase64) {
      if (onEnd) onEnd();
      return false;
    }

    const mime = res.mimeType || 'audio/wav';
    const audio = new Audio(`data:${mime};base64,${res.audioBase64}`);
    activeAudio = audio;

    return new Promise((resolve) => {
      audio.onended = () => {
        activeAudio = null;
        if (onEnd) onEnd();
        resolve(true);
      };
      audio.onerror = () => {
        activeAudio = null;
        if (onEnd) onEnd();
        resolve(false);
      };
      audio.play().catch(() => {
        activeAudio = null;
        if (onEnd) onEnd();
        resolve(false);
      });
    });
  } catch (err) {
    console.error('Sarvam TTS error:', err.message);
    if (onEnd) onEnd();
    return false;
  }
}

/**
 * Microphone Recorder with Web Audio API Waveform analyser
 */
export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
    this.dataArray = null;
    this.animId = null;
    this.isRecording = false;
  }

  async start(canvas, onLevel = null) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      if (canvas) {
        this._drawWaveform(canvas);
      }
    }

    this.audioChunks = [];
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    }

    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.audioChunks.push(e.data);
    };

    this.mediaRecorder.start(200);
    this.isRecording = true;
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        return resolve(null);
      }

      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.isRecording = false;

        if (this.stream) {
          this.stream.getTracks().forEach(t => t.stop());
          this.stream = null;
        }

        resolve(blob);
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        this.isRecording = false;
        resolve(null);
      }
    });
  }

  _drawWaveform(canvas) {
    const ctx = canvas.getContext('2d');
    const draw = () => {
      if (!this.isRecording) return;
      this.animId = requestAnimationFrame(draw);

      this.analyser.getByteFrequencyData(this.dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bufferLen = this.analyser.frequencyBinCount;
      const barWidth = (canvas.width / bufferLen) * 2;
      let x = 0;

      for (let i = 0; i < bufferLen; i++) {
        const barHeight = (this.dataArray[i] / 255) * canvas.height * 0.9;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#E06D53');
        gradient.addColorStop(0.5, '#F59E0B');
        gradient.addColorStop(1, '#0D5C75');

        ctx.fillStyle = gradient;
        const y = (canvas.height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - 1, Math.max(barHeight, 3));
        x += barWidth + 1;
      }
    };
    draw();
  }
}
