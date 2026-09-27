# 🎙️ Speak2Fill

> **Voice-guided form-filling web application designed with dignity and ease for the elderly, low-literacy individuals, and non-native-language users.**

Speak2Fill transforms intimidating paper forms (such as ration card applications, bank KYC, and school admissions) into a warm, calming, one-question-at-a-time spoken conversation in **Malayalam (മലയാളം)**, **Hindi (हिन्दी)**, **Tamil (தமிழ்)**, **Telugu (తెలుగు)**, or **English**.

---

## 🌟 Key Features

1. **Multilingual Voice-First Architecture**:
   - Native language selection in local scripts (മലയാളം, हिन्दी, தமிழ், తెలుగు, English) with audible native voice greetings.
   - Text-to-Speech (TTS) questions read out gently at a comfortable 0.9x speed suitable for elderly listeners.
   - Speech-to-Text (STT) transcription with auto-normalization for spoken numbers, dates, mobile numbers, and affirmations.

2. **AI Document Field Detection**:
   - Camera capture or photo upload sent to **Google Gemini 1.5 Flash Vision API** to extract fillable boxes, coordinates, labels, and localized question prompts.
   - Smart contextual fallback with pre-bundled official application forms (Kerala Priority Ration Card, State Bank of India Savings Account & KYC, State School Admission & Scholarship).

3. **Assistive UI/UX Design System**:
   - **One-Field-at-a-Time Focus**: Eliminates the cognitive overload of complex multi-column government forms.
   - **Large Touch Targets**: Minimum 56px touch boundaries (scalable up to 72px) with thumb-friendly layout.
   - **Scalable Typography**: Dedicated elderly text size switcher (`A`, `A+`, `A++`) scaling from 18px up to 26px base font size.
   - **Micro-Animations & Audio Earcons**: Gentle pulsing microphone orb, Web Audio API chimes for question start and successful checkmarks, and live animated waveform visualizer.
   - **Multi-sensory Status Cues**: Non-readers easily understand state through icons, color-coded pills, and voice announcements (`🎙️ Speak now` ➔ `⚙️ Processing` ➔ `✅ Got it! Please verify`).
   - **Fallbacks**: "Speak Again", "Type Instead" (keyboard popup), and "Skip Field" for noisy environments or complex names.

4. **Visual Document Overlay Summary**:
   - Overlays the user's spoken answers directly onto the original paper form image using exact coordinates.
   - Printable receipt and PDF-ready summary.

5. **Auto-Save & Resumable Sessions**:
   - Auto-saves progress to MongoDB after each answered field.
   - Users can safely close the app and resume right where they left off.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6 modules, MVC component structure, Web Audio API, MediaRecorder, HTML5 Canvas waveform)
- **Backend**: Node.js, Express 5, Multer (file uploads & in-memory audio streaming)
- **Database**: MongoDB with Mongoose ODM (collections: `FormTemplates`, `FillSessions`, `FieldProgress`) + zero-downtime auto-fallback store
- **AI Services**:
  - **Google Gemini API** (`gemini-1.5-flash` Vision) for OCR and field detection
  - **Sarvam AI API** (`saarika:v2` STT + `bulbul:v1` TTS) for Indic speech processing, with graceful browser Web Speech API fallback

---

## 📁 Project Structure

```
speak2fill/
├── .env.example                # Template for API keys
├── .env                        # Local configuration
├── package.json                # Dependencies and start scripts
├── server.js                   # Express server and static asset routes
├── src/
│   ├── config/
│   │   └── db.js               # Mongoose connector with in-memory fallback
│   ├── models/
│   │   ├── FormTemplate.js     # Form template schema (fields, positions, prompts)
│   │   ├── FillSession.js      # Session state, progress, and answers map
│   │   └── FieldProgress.js    # Step-by-step audit trail for each voice interaction
│   ├── routes/
│   │   ├── forms.js            # POST /api/forms/upload, GET /api/forms/templates
│   │   ├── sessions.js         # Session creation, field answer updates, resume
│   │   └── speech.js           # Proxies to Sarvam STT & TTS
│   ├── services/
│   │   ├── geminiService.js    # Google Gemini Vision field detection
│   │   └── sarvamService.js    # Sarvam Indic STT & TTS proxy
│   └── utils/
│       └── sampleForms.js      # 3 pre-built official Indian application forms
└── public/
    ├── index.html              # Accessible HTML5 shell
    ├── css/
    │   ├── main.css            # Warm, high-contrast assistive styling
    │   ├── accessibility.css   # Text scaling (18px/22px/26px) & warm dark mode
    │   └── animations.css      # Pulsing mic orb & radar scanner
    ├── js/
    │   ├── app.js              # Application controller & view router
    │   ├── state.js            # Global reactive store
    │   ├── api.js              # Backend REST API client
    │   ├── audio/
    │   │   ├── recorder.js     # MediaRecorder + Web Audio API waveform visualizer
    │   │   └── tts.js          # TTS player + audio earcon chimes
    │   ├── components/
    │   │   ├── languageSelect.js   # Native language selector & greeting previews
    │   │   ├── formUpload.js       # Camera capture, file upload & Gemini scanner
    │   │   ├── voiceCard.js        # Core one-field voice interaction card
    │   │   ├── reviewOverlay.js    # Visual form image with overlaid answers
    │   │   └── sessionHistory.js   # Resumable sessions list
    │   └── utils/
    │       ├── translations.js # Malayalam, Hindi, Tamil, Telugu, English dictionary
    │       └── validators.js   # Spoken number, date, phone, and boolean normalizer
    └── assets/
        └── sample-forms/       # Kerala Ration Card, SBI Account, School Admission SVGs
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```ini
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/speak2fill
GEMINI_API_KEY=your_gemini_api_key_here
SARVAM_API_KEY=your_sarvam_api_key_here
```
> **Note**: Speak2Fill includes built-in smart mock fallbacks for all services. If you do not have MongoDB running or have not yet generated Gemini/Sarvam API keys, the app runs **100% out of the box** using intelligent contextual OCR, browser Web Speech recognition, and sample official forms!

### 3. Start the Server
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/forms/upload` | Upload form photo / camera capture; invokes Gemini Vision detection |
| `GET` | `/api/forms/templates` | Retrieve available form templates |
| `GET` | `/api/forms/templates/:id` | Retrieve specific form template details |
| `POST` | `/api/sessions` | Create a new FillSession linked to a template and language |
| `GET` | `/api/sessions` | List saved sessions (filterable by `userId`) |
| `GET` | `/api/sessions/:id` | Resume session with answers, template, and field progress |
| `PATCH` | `/api/sessions/:id/field/:fieldId` | Save transcribed answer, validate format, update progress |
| `POST` | `/api/sessions/:id/complete` | Mark session as officially submitted |
| `POST` | `/api/speech/transcribe` | Proxies client audio recording to Sarvam STT |
| `POST` | `/api/speech/synthesize` | Proxies text prompt to Sarvam TTS |
| `GET` | `/api/status` | System health check and API diagnostics |

---

## 🔒 Privacy & Trust
All documents and audio recordings uploaded to Speak2Fill are stored locally in the secure `uploads/` directory and are never shared or used to train public models.
