const express = require('express');
const router = express.Router();
const multer = require('multer');
const sarvamService = require('../services/sarvamService');

// Multer memory storage for direct audio forwarding to Sarvam STT API
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB audio limit
});

/**
 * POST /api/speech/transcribe
 * Receives an audio blob from client mic (via MediaRecorder),
 * proxies it to Sarvam STT (Saarika model), and returns transcribed text.
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const language = req.body.language || 'en';
    const clientTranscriptFallback = req.body.clientTranscriptFallback || '';
    const audioBuffer = req.file ? req.file.buffer : null;
    const filename = req.file?.originalname || 'recording.webm';

    if (!audioBuffer && !clientTranscriptFallback) {
      return res.status(400).json({ error: 'No audio file or fallback transcript received' });
    }

    const result = await sarvamService.transcribeAudio(
      audioBuffer,
      language,
      filename,
      clientTranscriptFallback
    );

    return res.status(200).json({
      success: true,
      transcript: result.transcript,
      language: result.language_code,
      confidence: result.confidence,
      source: result.source
    });
  } catch (err) {
    console.error('❌ [Speech STT] Error in transcription route:', err.message);
    return res.status(500).json({
      error: 'Failed to transcribe spoken audio',
      details: err.message
    });
  }
});

/**
 * POST /api/speech/synthesize
 * Receives text and target language ('ml', 'hi', 'ta', 'te', 'en'),
 * proxies to Sarvam TTS (Bulbul model), and returns base64 audio or signals client Web Speech fallback.
 */
router.post('/synthesize', async (req, res) => {
  try {
    const { text, language = 'en' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text prompt is required for speech synthesis' });
    }

    const result = await sarvamService.synthesizeSpeech(text, language);

    return res.status(200).json({
      success: true,
      audioBase64: result.audioBase64,
      mimeType: result.mimeType || 'audio/mpeg',
      useClientWebSpeech: result.useClientWebSpeech,
      text: result.text,
      language: result.language
    });
  } catch (err) {
    console.error('❌ [Speech TTS] Error in synthesis route:', err.message);
    return res.status(500).json({
      error: 'Failed to synthesize speech',
      details: err.message,
      useClientWebSpeech: true
    });
  }
});

module.exports = router;
