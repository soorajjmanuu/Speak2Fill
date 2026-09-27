require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { connectDB, getDbMode } = require('./src/config/db');
const { seedSampleTemplates } = require('./src/utils/sampleForms');

const formsRouter = require('./src/routes/forms');
const sessionsRouter = require('./src/routes/sessions');
const speechRouter = require('./src/routes/speech');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static frontend and uploaded files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// System Status and Diagnostics API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Speak2Fill',
    version: '1.0.0',
    database: getDbMode(),
    aiServices: {
      geminiVision: {
        configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
        status: process.env.GEMINI_API_KEY ? 'Active (Google Gemini 1.5 Flash)' : 'Fallback Contextual Detector Active'
      },
      sarvamIndicSpeech: {
        configured: Boolean(process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY.trim().length > 0),
        status: process.env.SARVAM_API_KEY ? 'Active (Sarvam Saarika STT + Bulbul TTS)' : 'Client Web Speech & Fallback Active'
      }
    },
    supportedLanguages: [
      { code: 'ml', name: 'Malayalam', native: 'മലയാളം', script: 'മലയാളം' },
      { code: 'hi', name: 'Hindi', native: 'हिन्दी', script: 'हिन्दी' },
      { code: 'ta', name: 'Tamil', native: 'தமிழ்', script: 'தமிழ்' },
      { code: 'te', name: 'Telugu', native: 'తెలుగు', script: 'తెలుగు' },
      { code: 'en', name: 'English', native: 'English', script: 'English' }
    ]
  });
});

// API Routes
app.use('/api/forms', formsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/speech', speechRouter);

// Fallback to index.html for SPA frontend routing (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start Server
async function startServer() {
  await connectDB();
  await seedSampleTemplates();

  app.listen(PORT, () => {
    console.log('\n======================================================');
    console.log('🎙️   Speak2Fill — Voice-Guided Assistive Form Filler');
    console.log(`🌐  Server running at: http://localhost:${PORT}`);
    console.log(`🗄️   Database mode: ${getDbMode().toUpperCase()}`);
    console.log(`🤖  Gemini AI: ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'READY (Contextual Fallback Active)'}`);
    console.log(`🇮🇳  Sarvam AI: ${process.env.SARVAM_API_KEY ? 'CONFIGURED' : 'READY (Browser Web Speech Active)'}`);
    console.log('======================================================\n');
  });
}

startServer();
