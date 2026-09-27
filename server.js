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
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Check for compiled React client in client/dist, fallback to public
const clientDist = path.join(__dirname, 'client/dist');
const staticDir = fs.existsSync(clientDist) ? clientDist : path.join(__dirname, 'public');
console.log(`📁 [Static Files] Serving frontend from: ${staticDir}`);

app.use(express.static(staticDir));
app.use('/uploads', express.static(uploadDir));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// System Status and Diagnostics API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Speak2Fill',
    version: '2.0.0',
    frontend: fs.existsSync(clientDist) ? 'React (Vite Build)' : 'Vanilla JS',
    database: getDbMode(),
    aiServices: {
      openaiVision: {
        configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0),
        status: process.env.OPENAI_API_KEY ? 'Active (OpenAI GPT-4o Vision)' : 'OPENAI_API_KEY Missing'
      },
      sarvamIndicSpeech: {
        configured: Boolean(process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY.trim().length > 0),
        status: process.env.SARVAM_API_KEY ? 'Active (Sarvam saaras:v3 STT + bulbul:v3 TTS)' : 'SARVAM_API_KEY Missing'
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

// Fallback to index.html for SPA frontend routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    const indexPath = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
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
    console.log(`🤖  OpenAI Vision: ${process.env.OPENAI_API_KEY ? 'CONFIGURED' : 'NEEDS OPENAI_API_KEY'}`);
    console.log(`🇮🇳  Sarvam AI: ${process.env.SARVAM_API_KEY ? 'ACTIVE (bulbul:v3 + saaras:v3)' : 'NEEDS SARVAM_API_KEY'}`);
    console.log('======================================================\n');
  });
}

startServer();
