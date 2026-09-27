/**
 * Audio Recording and Live Waveform Visualizer.
 * Uses Web Audio API and MediaRecorder, with optional SpeechRecognition parallel stream.
 */
export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    this.animationFrameId = null;
    this.isRecording = false;
    this.stream = null;
    this.speechRecognition = null;
    this.liveInterimTranscript = '';
  }

  /**
   * Request microphone permissions and initialize AudioContext
   */
  async initMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone audio recording is not supported in this browser.');
    }

    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!this.audioContext && AudioContextClass) {
      this.audioContext = new AudioContextClass();
    }

    return true;
  }

  /**
   * Start recording audio and rendering waveform
   * @param {HTMLCanvasElement} canvasElement - Canvas to draw waveform onto
   * @param {string} language - 'ml', 'hi', 'ta', 'te', 'en'
   * @param {Function} onTranscriptUpdate - Live interim callback
   */
  async startRecording(canvasElement, language = 'en', onTranscriptUpdate = null) {
    await this.initMic();

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.audioChunks = [];
    this.liveInterimTranscript = '';

    // Initialize Web Audio analyser for waveform
    if (this.audioContext && this.stream) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      if (canvasElement) {
        this._startWaveformVisualizer(canvasElement);
      }
    }

    // Initialize MediaRecorder
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    }

    const options = mimeType ? { mimeType } : undefined;
    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(200); // chunk every 200ms
    this.isRecording = true;

    // Optional parallel SpeechRecognition for real-time live preview & fallback
    this._startParallelRecognition(language, onTranscriptUpdate);
  }

  _startParallelRecognition(lang, callback) {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      this.speechRecognition = new SpeechRecognitionClass();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;

      const langMap = {
        ml: 'ml-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        te: 'te-IN',
        en: 'en-IN'
      };
      this.speechRecognition.lang = langMap[lang] || 'en-IN';

      this.speechRecognition.onresult = (event) => {
        let finalStr = '';
        let interimStr = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }
        const text = (finalStr + ' ' + interimStr).trim();
        this.liveInterimTranscript = text;
        if (callback) callback(text);
      };

      this.speechRecognition.onerror = (e) => {
        // Recognition non-fatal; MediaRecorder still captures audio buffer
        console.log('SpeechRecognition notice:', e.error);
      };

      this.speechRecognition.start();
    } catch (e) {
      console.warn('SpeechRecognition initialization skipped:', e);
    }
  }

  /**
   * Stop recording and return audio blob + interim transcript
   */
  async stopRecording() {
    return new Promise((resolve) => {
      if (!this.isRecording || !this.mediaRecorder) {
        return resolve({ blob: null, clientTranscript: this.liveInterimTranscript });
      }

      if (this.speechRecognition) {
        try {
          this.speechRecognition.stop();
        } catch (e) {}
      }

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.isRecording = false;
        resolve({
          blob: audioBlob,
          clientTranscript: this.liveInterimTranscript
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        this.isRecording = false;
        resolve({ blob: null, clientTranscript: this.liveInterimTranscript });
      }
    });
  }

  /**
   * Draw smooth animated audio waveform bars on canvas
   */
  _startWaveformVisualizer(canvas) {
    const ctx = canvas.getContext('2d');
    const draw = () => {
      if (!this.isRecording) return;
      this.animationFrameId = requestAnimationFrame(draw);

      this.analyser.getByteFrequencyData(this.dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bufferLength = this.analyser.frequencyBinCount;
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (this.dataArray[i] / 255) * canvas.height * 0.9;

        // Gradient color from warm amber to deep teal
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#E06D53');
        gradient.addColorStop(0.5, '#F59E0B');
        gradient.addColorStop(1, '#0D5C75');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        const y = (canvas.height - barHeight) / 2;
        ctx.roundRect ? ctx.roundRect(x, y, barWidth - 2, Math.max(barHeight, 4), 3) : ctx.fillRect(x, y, barWidth - 2, Math.max(barHeight, 4));
        ctx.fill();

        x += barWidth + 1;
      }
    };

    draw();
  }
}
