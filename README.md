# Clinical Document Assistant

> AI-powered medical scribe that transcribes doctor–patient consultations and generates structured SOAP notes using Google Gemini.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?logo=google&logoColor=white)

---

## What It Does

Physicians spend an average of **2 hours per day** on clinical documentation. This application cuts that to seconds:

1. **Upload or record** a consultation audio file directly in the browser
2. **Gemini AI transcribes** the conversation automatically
3. **SOAP notes are generated** — Subjective, Objective, Assessment, Plan
4. **Review, edit, and export** as PDF or plain text

---

## Features

- **Dual input modes** — Upload existing audio files (MP3, WAV, M4A, WebM, OGG) or record live in-browser via the MediaRecorder API
- **Real-time waveform visualizer** — Canvas-based audio feedback during recording using the Web Audio API
- **Adjustable recording quality** — Choose bitrate/sample rate before recording begins
- **AI transcription + SOAP generation** — Single Gemini API call handles both tasks via structured prompt engineering
- **Background processing** — Upload returns immediately; processing runs asynchronously with live status polling every 2 seconds
- **Editable SOAP notes** — Inline markdown editor with save/cancel flow and optimistic updates
- **Export** — Download as PDF (jsPDF) or copy as plain text
- **JWT authentication** — Secure register/login with modal UI, no full-page navigation
- **Consultation management** — Search by patient/doctor name, filter by status, sort newest/oldest, paginate results
- **Responsive design** — Mobile-first layout with sticky navbar and collapsible mobile menu

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + TypeScript | Component-based UI with full type safety |
| Bundler | Vite | Fast HMR dev server and optimized production builds |
| Styling | Tailwind CSS v3 | Utility-first styling with custom indigo/cyan palette |
| Routing | React Router v6 | Client-side navigation and protected route layouts |
| HTTP | Fetch API + Axios | `FormData` uploads; REST calls via Axios instance |
| Icons | Lucide React | Consistent SVG icon set |
| Export | jsPDF | Client-side PDF generation without server round-trip |
| Markdown | react-markdown | SOAP note rendering |
| Backend | FastAPI | Async Python REST API with automatic OpenAPI docs |
| ORM | SQLAlchemy 2.0 | Declarative models, session management |
| Migrations | Alembic | Schema version control with upgrade/downgrade |
| Database | PostgreSQL | Relational data store |
| Auth | python-jose + passlib | JWT access tokens + bcrypt password hashing |
| AI | Google Gemini 2.0 Flash | Audio transcription and SOAP note generation |
| File I/O | aiofiles | Non-blocking audio file reads in async endpoints |

---

## Architecture

```
Browser
  │
  ├── LandingPage  (public)
  │     └── AuthModal  (login / register tabs)
  │
  └── Protected App  (JWT required)
        ├── Dashboard      → GET /api/consultations/stats/dashboard
        ├── Upload         → POST /api/consultations/upload
        ├── Consultations  → GET  /api/consultations
        └── Detail         → GET  /api/consultations/:id
                             PUT  /api/consultations/:id/soap

FastAPI Backend
  │
  ├── /api/auth          register · login · me
  ├── /api/consultations upload · list · get · delete · retry · soap
  │
  ├── Background Thread (per upload)
  │     ├── Read audio file with aiofiles
  │     ├── Upload to Gemini Files API
  │     ├── Send structured prompt → transcribe + generate SOAP
  │     └── Persist transcript + soap_note to PostgreSQL
  │
  └── PostgreSQL
        ├── users         (id, email, hashed_password, created_at)
        └── consultations (id, user_id, status, audio_filename,
                           transcript, soap_note, patient_name,
                           doctor_name, processing_time, ...)
```

---

## Project Structure

```
clinical-document-assistant/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AuthModal.tsx          # Login/Register modal
│       │   ├── AudioRecorder.tsx      # Full recording UI orchestrator
│       │   ├── AudioPlayer.tsx        # Playback for uploaded files
│       │   ├── WaveformVisualizer.tsx # Real-time canvas waveform
│       │   ├── SOAPEditor.tsx         # Editable SOAP note with markdown
│       │   ├── ExportMenu.tsx         # PDF / text export dropdown
│       │   ├── FileUpload.tsx         # Drag-and-drop file picker
│       │   ├── ProgressBar.tsx        # Upload progress indicator
│       │   ├── Layout.tsx             # Sticky navbar + Outlet wrapper
│       │   └── RecordingControls.tsx  # Record/Pause/Stop buttons
│       ├── hooks/
│       │   ├── useAuth.tsx            # Auth context + JWT localStorage
│       │   ├── useFileUpload.ts       # Upload state machine + AbortController
│       │   ├── useAudioRecorder.ts    # MediaRecorder API wrapper
│       │   └── useAudioAnalyzer.ts    # Web Audio API + volume metering
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Upload.tsx
│       │   ├── Consultations.tsx
│       │   └── ConsultationDetail.tsx
│       ├── services/api.ts            # Axios instance + typed API functions
│       ├── types/index.ts             # Shared TypeScript interfaces/types
│       └── utils/
│           ├── audioRecordingUtils.ts # MIME type negotiation + quality config
│           ├── exportUtils.ts         # PDF layout and generation logic
│           ├── fileValidation.ts      # Audio file type/size validation
│           └── validationUtils.ts     # Auth form validators
│
└── backend/
    └── app/
        ├── main.py                    # FastAPI app, CORS, router registration
        ├── config.py                  # Pydantic Settings (env var parsing)
        ├── database.py                # SQLAlchemy engine + session factory
        ├── api/
        │   ├── auth.py                # /register /login /me endpoints
        │   └── consultations.py       # All consultation CRUD + processing
        ├── models/
        │   ├── user.py                # User SQLAlchemy model
        │   └── consultation.py        # Consultation model + status enum
        ├── schemas/
        │   ├── user.py                # Pydantic request/response schemas
        │   └── consultation.py        # ConsultationResponse, ConsultationList
        ├── services/
        │   └── gemini_service.py      # Gemini SDK wrapper + prompt templates
        └── tasks/
            └── processing.py          # Background thread processing pipeline
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL running locally
- Google Gemini API key

### Backend Setup

```bash
cd backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Set DATABASE_URL, SECRET_KEY, GEMINI_API_KEY in .env

alembic upgrade head             # Run database migrations

uvicorn app.main:app --reload --port 8000
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend Setup

```bash
cd frontend

npm install

cp .env.example .env
# VITE_API_URL=http://localhost:8000

npm run dev
# App runs at http://localhost:5173
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Get JWT access token |
| GET | `/api/auth/me` | Yes | Current user info |
| POST | `/api/consultations/upload` | Yes | Upload audio + trigger AI processing |
| GET | `/api/consultations` | Yes | List consultations (paginated) |
| GET | `/api/consultations/:id` | Yes | Get single consultation |
| DELETE | `/api/consultations/:id` | Yes | Delete consultation + audio file |
| PUT | `/api/consultations/:id/soap` | Yes | Update SOAP note content |
| POST | `/api/consultations/:id/retry` | Yes | Retry failed processing |
| GET | `/api/consultations/stats/dashboard` | Yes | Aggregated dashboard metrics |

All protected endpoints require `Authorization: Bearer <token>` header.

---

## Environment Variables

**`backend/.env`**
```env
DATABASE_URL=postgresql://your_user@localhost/clinical_docs
SECRET_KEY=your-secret-key-at-least-32-characters
GEMINI_API_KEY=your-gemini-api-key
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:8000
```

---

## License

MIT — see [LICENSE](LICENSE)
