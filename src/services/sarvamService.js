/**
 * Service to interface with Sarvam AI APIs:
 * - Speech-to-Text (STT) via model `saaras:v3`
 * - Text-to-Speech (TTS) via model `bulbul:v3`
 *
 * Supported Indic languages:
 * Malayalam (ml-IN), Hindi (hi-IN), Tamil (ta-IN), Telugu (te-IN), English (en-IN)
 */
class SarvamService {
  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY || '';
    this.sttUrl = 'https://api.sarvam.ai/speech-to-text';
    this.ttsUrl = 'https://api.sarvam.ai/text-to-speech';
  }

  _getKey() {
    return process.env.SARVAM_API_KEY || this.apiKey;
  }

  _mapLanguageCode(lang) {
    const map = {
      ml: 'ml-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      en: 'en-IN'
    };
    return map[lang] || 'en-IN';
  }

  _getDefaultSpeaker(lang) {
    const speakerMap = {
      ml: 'priya',
      hi: 'aditya',
      ta: 'vijay',
      te: 'kavitha',
      en: 'priya'
    };
    return speakerMap[lang] || 'priya';
  }

  /**
   * Transcribe recorded audio buffer using Sarvam STT (saaras:v3)
   * @param {Buffer} audioBuffer - Binary audio buffer (wav/webm/mp3)
   * @param {string} language - 'ml', 'hi', 'ta', 'te', 'en'
   * @param {string} originalFilename - filename e.g. 'recording.webm'
   */
  async transcribeAudio(audioBuffer, language = 'en', originalFilename = 'recording.webm') {
    const key = this._getKey();
    if (!key) {
      throw new Error('SARVAM_API_KEY is not configured in .env. Please set SARVAM_API_KEY.');
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('No audio data received for transcription.');
    }

    const langCode = this._mapLanguageCode(language);
    console.log(`🎙️ [SarvamService] Calling Sarvam STT (model: saaras:v3, language: ${langCode}, size: ${audioBuffer.length} bytes)...`);

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, originalFilename);
    formData.append('language_code', langCode);
    formData.append('model', 'saaras:v3');

    const response = await fetch(this.sttUrl, {
      method: 'POST',
      headers: {
        'api-subscription-key': key
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ [SarvamService] STT Error (${response.status}):`, errText);
      throw new Error(`Sarvam STT failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    console.log(`✅ [SarvamService] STT Transcribed text: "${data.transcript}"`);

    return {
      transcript: data.transcript || '',
      language_code: data.language_code || langCode,
      confidence: 0.98,
      source: 'sarvam_saaras_v3'
    };
  }

  /**
   * Synthesize text to spoken audio using Sarvam TTS (bulbul:v3)
   * @param {string} text - Prompt text to speak aloud
   * @param {string} language - 'ml', 'hi', 'ta', 'te', 'en'
   */
  async synthesizeSpeech(text, language = 'en') {
    const key = this._getKey();
    if (!key) {
      throw new Error('SARVAM_API_KEY is not configured in .env. Please set SARVAM_API_KEY.');
    }

    const targetLangCode = this._mapLanguageCode(language);
    const speaker = this._getDefaultSpeaker(language);
    console.log(`🔊 [SarvamService] Calling Sarvam TTS (model: bulbul:v3, lang: ${targetLangCode}, speaker: ${speaker}): "${text.substring(0, 35)}..."`);

    const payload = {
      inputs: [text],
      target_language_code: targetLangCode,
      speaker: speaker,
      pitch: 0,
      pace: 1.0,
      loudness: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: 'bulbul:v3'
    };

    const response = await fetch(this.ttsUrl, {
      method: 'POST',
      headers: {
        'api-subscription-key': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ [SarvamService] TTS Error (${response.status}):`, errText);
      throw new Error(`Sarvam TTS failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const audioBase64 = data?.audios?.[0];

    if (!audioBase64) {
      throw new Error('Sarvam TTS returned empty audio list.');
    }

    console.log(`✅ [SarvamService] TTS generated audio successfully (${audioBase64.length} chars base64)`);

    return {
      audioBase64,
      mimeType: 'audio/wav',
      useClientWebSpeech: false,
      text,
      language
    };
  }
}

module.exports = new SarvamService();
