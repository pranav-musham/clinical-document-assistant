# Technical Handbook — Clinical Document Assistant

> Interview preparation reference. Covers architecture, design decisions, data flow, and common questions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Frontend Deep Dive](#3-frontend-deep-dive)
4. [Backend Deep Dive](#4-backend-deep-dive)
5. [Database Design](#5-database-design)
6. [Authentication Flow](#6-authentication-flow)
7. [AI Integration — Gemini](#7-ai-integration--gemini)
8. [Audio Pipeline](#8-audio-pipeline)
9. [Key Design Decisions](#9-key-design-decisions)
10. [Performance & Scalability](#10-performance--scalability)
11. [Interview Q&A](#11-interview-qa)

---

## 1. Project Overview

**Problem:** Physicians document consultations manually, costing ~2 hours/day. Existing dictation tools require expensive hardware or subscription software.

**Solution:** A browser-based tool where a doctor uploads or records consultation audio. Google Gemini 2.0 Flash transcribes the audio and generates a structured SOAP note in one API call. The doctor reviews, edits, and exports.

**Scale:** Single-user to clinic-level (dozens of consultations/day). Not designed for hospital-wide EHR integration (that would require HL7 FHIR compliance).

---

## 2. System Architecture

### High-Level Diagram

```
┌──────────────────────────────────────────────────┐
│                    Browser                        │
│                                                  │
│  React SPA (Vite)                                │
│  ├── Public: LandingPage + AuthModal             │
│  └── Protected (JWT): Dashboard · Upload ·       │
│       Consultations · ConsultationDetail         │
└───────────────┬──────────────────────────────────┘
                │  HTTP / REST + Bearer token
┌───────────────▼──────────────────────────────────┐
│             FastAPI (uvicorn)                     │
│                                                  │
│  /api/auth          → JWT issue + validation     │
│  /api/consultations → CRUD + file handling       │
│                                                  │
│  Background Thread Pool                          │
│  └── ProcessingWorker                            │
│       ├── Read audio → aiofiles                  │
│       ├── Upload → Gemini Files API              │
│       ├── Prompt → Gemini GenerateContent API    │
│       └── Write results → PostgreSQL            │
└───────────────┬──────────────────────────────────┘
                │  psycopg2 / SQLAlchemy
┌───────────────▼──────────────────────────────────┐
│              PostgreSQL                           │
│  users · consultations                           │
└──────────────────────────────────────────────────┘
                │  REST / SDK
┌───────────────▼──────────────────────────────────┐
│        Google Gemini 2.0 Flash API               │
│  Files API (upload audio) + GenerateContent      │
└──────────────────────────────────────────────────┘
```

### Request Lifecycle (Upload)

```
1. User selects audio file in browser
2. POST /api/consultations/upload (multipart/form-data)
   ├── FastAPI validates file type + size
   ├── Saves file to disk with uuid4 filename
   ├── Creates Consultation row (status=PENDING)
   ├── Spawns background thread → start_background_processing(id)
   └── Returns ConsultationResponse (HTTP 201) immediately
3. Background thread:
   ├── status → TRANSCRIBING
   ├── Reads audio bytes
   ├── Uploads to Gemini Files API (gets file URI)
   ├── Sends prompt: "Transcribe and generate SOAP note for this audio"
   ├── Parses response → transcript + soap_note
   ├── status → COMPLETED, stores results
   └── On error → status=FAILED, stores error_message
4. Frontend polls GET /api/consultations/:id every 2s
   └── Re-renders status badge until status ∈ {completed, failed}
```

---

## 3. Frontend Deep Dive

### State Management Strategy

No global state library (Redux/Zustand) was used. State is managed at three levels:

| Level | Mechanism | Used For |
|---|---|---|
| Global | React Context (`useAuth`) | User session, JWT token |
| Page-local | `useState` in page components | Form inputs, filter state, UI toggles |
| Cross-request | Custom hooks | Upload progress map, audio recording state |

**Why no Redux?** The app has one true global concern (auth). Everything else is local to a page or a single user interaction. Adding Redux would be over-engineering for this scope.

### Custom Hooks

#### `useAuth` (Context Hook)
```typescript
// Stores JWT in localStorage
// Provides: user, login(), logout(), register(), loading
// On app load: reads token → GET /api/auth/me → sets user
// On logout: clears token → redirects to /
```

#### `useFileUpload`
```typescript
// Manages a Map<fileId, UploadProgress> via useState
// abortControllers: useRef<Map<string, AbortController>>
//   - useRef (not useState) because Map mutations don't need re-renders
// uploadFile(): fetch with FormData, updates progress state
// cancelUpload(fileId): calls controller.abort()
// uploadFiles(): runs uploads in parallel with Promise.allSettled()
```

**Key decision — `useRef` for AbortControllers:**
Map mutations (`.set()`, `.delete()`) are imperative and don't produce new object references, so `useState` would never trigger a re-render on mutation. `useRef` is the correct React pattern for stable mutable containers.

#### `useAudioRecorder`
```typescript
// Wraps the browser MediaRecorder API
// States: idle → recording → paused → stopped → error
// Collects audio chunks via ondataavailable every 1000ms
// onstop: assembles Blob → converts to File → parent callback
// Timer: useRef<setInterval> tracking elapsed recording seconds
```

**MIME type negotiation:** Different browsers support different codecs (`audio/webm;codecs=opus` on Chrome, `audio/mp4` on Safari). `getQualityWithMimeType()` in `audioRecordingUtils.ts` iterates supported types at runtime.

#### `useAudioAnalyzer`
```typescript
// Web Audio API: MediaStream → AudioContext → AnalyserNode
// requestAnimationFrame loop reads Uint8Array frequency data
// Calculates average volume (0–1) for waveform bar heights
// Cleanup: cancelAnimationFrame + audioContext.close() on unmount
```

### Component Architecture

```
AudioRecorder (orchestrator)
├── QualitySelector          ← bitrate/sampleRate config
├── RecordingControls        ← start/pause/stop/discard buttons
├── RecordingTimer           ← elapsed time display
├── WaveformVisualizer       ← canvas bar chart (Web Audio API data)
└── AudioPlayer              ← playback after recording stops
```

**Separation of concerns:** `AudioRecorder` owns state and passes callbacks down. Each child is a pure presentational component with no internal state except animation frames.

### Routing Structure

```typescript
// App.tsx
<Routes>
  <Route path="/" element={<LandingPage />} />          // public
  <Route element={<Layout />}>                          // protected (Layout checks JWT)
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/upload" element={<Upload />} />
    <Route path="/consultations" element={<Consultations />} />
    <Route path="/consultations/:id" element={<ConsultationDetail />} />
  </Route>
</Routes>
```

`Layout.tsx` acts as a guard: if `useAuth()` returns no user after loading, it renders `<Navigate to="/" />`. No separate PrivateRoute component needed.

### Polling Implementation

```typescript
// ConsultationDetail.tsx
const pollIntervalRef = useRef<number | null>(null)

const startPolling = () => {
  pollIntervalRef.current = window.setInterval(async () => {
    const data = await consultationAPI.getById(id)
    setConsultation(data)
    if (['completed', 'failed'].includes(data.status)) stopPolling()
  }, 2000)
}

useEffect(() => {
  loadConsultation()
  return () => stopPolling()  // cleanup on unmount
}, [id])
```

**Why `useRef` for interval ID?** Storing the interval ID in a ref (not state) means clearing it doesn't cause a re-render, which avoids the risk of starting a second interval.

---

## 4. Backend Deep Dive

### FastAPI Application Structure

```python
# main.py
app = FastAPI(title="Clinical Documentation Assistant")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"])
app.include_router(auth_router, prefix="/api/auth")
app.include_router(consultations_router, prefix="/api")
```

### Dependency Injection

FastAPI's `Depends()` is used for two cross-cutting concerns:

```python
# 1. Database session — fresh session per request, always closed
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 2. Authentication — validates JWT, returns User ORM object
def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    payload = jose.jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user: raise HTTPException(401)
    return user

# Usage in any endpoint:
async def upload_consultation(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
```

### Background Processing

```python
# tasks/processing.py
_processing_tasks: dict[int, bool] = {}  # in-memory registry

def start_background_processing(consultation_id: int):
    thread = threading.Thread(
        target=process_consultation_sync,
        args=(consultation_id,),
        daemon=True
    )
    _processing_tasks[consultation_id] = True
    thread.start()

def process_consultation_sync(consultation_id: int):
    db = SessionLocal()  # own session (not the request session)
    try:
        consultation = db.query(Consultation).get(consultation_id)
        consultation.status = ConsultationStatus.TRANSCRIBING
        db.commit()

        result = asyncio.run(gemini_service.process_audio(consultation.audio_filename))
        consultation.transcript = result.transcript
        consultation.soap_note = result.soap_note
        consultation.status = ConsultationStatus.COMPLETED
        consultation.processing_time = result.duration
        db.commit()
    except Exception as e:
        consultation.status = ConsultationStatus.FAILED
        consultation.error_message = str(e)
        db.commit()
    finally:
        db.close()
        _processing_tasks.pop(consultation_id, None)
```

**Why threads instead of Celery/async tasks?**
- No need for a message broker (Redis/RabbitMQ) for this scale
- `asyncio.run()` inside the thread allows calling async Gemini SDK methods
- Daemon threads are cleaned up if the process exits
- Trade-off: no task persistence across restarts; retried via the `/retry` endpoint

### Pydantic Settings

```python
# config.py
class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    GEMINI_API_KEY: str
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_AUDIO_FORMATS: list[str] = ["audio/mpeg", "audio/wav", ...]

    class Config:
        env_file = ".env"

settings = Settings()
```

Pydantic validates types at startup — if `GEMINI_API_KEY` is missing, the server refuses to start with a clear error.

---

## 5. Database Design

### Schema

```sql
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE consultations (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    patient_name    VARCHAR(255),
    doctor_name     VARCHAR(255),
    audio_filename  VARCHAR(255),           -- uuid4.ext on disk
    audio_duration  FLOAT,
    transcript      TEXT,
    soap_note       TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    processing_time FLOAT,
    error_message   TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP
);
```

### Status State Machine

```
PENDING → TRANSCRIBING → GENERATING → COMPLETED
                                    ↘ FAILED
```

- `PENDING`: File saved, thread spawned but not started
- `TRANSCRIBING`: Uploaded to Gemini Files API, awaiting response
- `GENERATING`: Gemini response received, parsing SOAP structure
- `COMPLETED`: All fields populated, ready to view
- `FAILED`: `error_message` contains the Python exception string

### Migrations (Alembic)

Three migrations exist:
1. Initial `users` and `consultations` tables
2. Secondary migration (schema refinement)
3. `patient_name` and `doctor_name` columns added as nullable fields

```bash
# Create a new migration after model changes:
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## 6. Authentication Flow

### Registration

```
POST /api/auth/register { email, password, full_name }
  → bcrypt.hash(password, rounds=12) → hashed_password
  → INSERT INTO users
  → return UserResponse (no token)

POST /api/auth/login { email, password }
  → SELECT user WHERE email=email
  → bcrypt.verify(password, hashed_password)
  → jwt.encode({ sub: user.id, exp: now+7days }, SECRET_KEY, HS256)
  → return { access_token, token_type: "bearer" }
```

### Token Storage and Usage

```typescript
// Frontend: useAuth.tsx
localStorage.setItem('token', data.access_token)

// Every API request:
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

// On app load:
const token = localStorage.getItem('token')
if (token) {
  GET /api/auth/me  →  sets user state
}
```

**Security considerations:**
- `localStorage` is vulnerable to XSS (acceptable trade-off for this internal tool; production would use `httpOnly` cookies)
- Tokens expire in 7 days (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Passwords never stored in plaintext; bcrypt with 12 rounds (~300ms hash time)
- All consultation endpoints filter by `user_id = current_user.id` — users can only access their own data

---

## 7. AI Integration — Gemini

### Why Gemini 2.0 Flash?

| Model | Strength | Reason chosen |
|---|---|---|
| Gemini 2.0 Flash | Native audio understanding, fast, cheap | Can process raw audio without separate ASR step |
| Whisper (OpenAI) | Transcription only | Would need a second LLM call for SOAP generation |
| GPT-4o audio | Similar capability | Google Gemini API is free-tier friendly |

### The Prompt Strategy

Rather than two separate API calls (transcribe → generate SOAP), one structured prompt handles both:

```python
prompt = """
You are a medical documentation assistant.

Listen to this doctor-patient consultation audio and:

1. Transcribe the full conversation verbatim, labeling speakers as Doctor/Patient.

2. Generate a structured SOAP note:
   SUBJECTIVE:
   [Patient's reported symptoms, history, concerns in their own words]

   OBJECTIVE:
   [Clinician observations, vital signs, examination findings mentioned]

   ASSESSMENT:
   [Diagnosis or differential diagnoses discussed]

   PLAN:
   [Treatment plan, prescriptions, follow-up, referrals]

Return your response in this exact format:
TRANSCRIPT:
[full transcript here]

SOAP NOTE:
[structured note here]
"""
```

**Parsing the response:**
```python
# gemini_service.py
response_text = result.text
transcript = response_text.split("SOAP NOTE:")[0].replace("TRANSCRIPT:", "").strip()
soap_note = response_text.split("SOAP NOTE:")[1].strip()
```

### Gemini Files API Flow

Audio files cannot be sent inline for large files. The Gemini Files API is used:

```python
# 1. Upload file (returns a File object with a URI)
audio_file = genai.upload_file(file_path, mime_type="audio/mpeg")

# 2. Wait for file to be processed
while audio_file.state.name == "PROCESSING":
    await asyncio.sleep(2)
    audio_file = genai.get_file(audio_file.name)

# 3. Reference in generate call
model = genai.GenerativeModel("gemini-2.0-flash")
response = model.generate_content([audio_file, prompt])
```

---

## 8. Audio Pipeline

### Upload Flow

```
File selected in browser
  → fileValidation.ts: check MIME type + size ≤ 50MB
  → FileUpload component: show preview + AudioPlayer
  → useFileUpload.uploadFile():
       FormData.append("file", file)
       fetch POST /api/consultations/upload
       AbortController signal for cancellation
  → ProgressBar shows status: uploading → processing → complete
```

### Recording Flow

```
User clicks "Record"
  → navigator.mediaDevices.getUserMedia({ audio: true })
  → AudioContext created → AnalyserNode connected
  → MediaRecorder.start(1000) [1-second chunks]
  → requestAnimationFrame loop reads frequency data → WaveformVisualizer
  → User clicks "Stop"
  → MediaRecorder.stop() → onstop fires
  → Blob assembled from chunks → converted to File
  → Passed to parent via onRecordingComplete(file)
  → Same upload flow as above
```

### MIME Type Negotiation

```typescript
// audioRecordingUtils.ts
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',  // Chrome, Edge
  'audio/webm',               // Chrome fallback
  'audio/ogg;codecs=opus',   // Firefox
  'audio/mp4',                // Safari
]

export function getQualityWithMimeType(quality: AudioQuality): AudioQuality {
  const supported = PREFERRED_MIME_TYPES.find(MediaRecorder.isTypeSupported)
  return { ...quality, mimeType: supported || 'audio/webm' }
}
```

### Export (PDF Generation)

```typescript
// exportUtils.ts — uses jsPDF
const doc = new jsPDF()
doc.setFontSize(16)
doc.text("SOAP Note", 20, 20)
// Split long text to fit page width
const lines = doc.splitTextToSize(soapNote, 170)
doc.text(lines, 20, 40)
// Add new pages automatically if content overflows
doc.save(`soap-note-${consultationId}.pdf`)
```

---

## 9. Key Design Decisions

### 1. Single Gemini Call vs. Separate Transcription + Generation

**Chosen:** One call that transcribes AND generates the SOAP note.

**Trade-off:** If transcription is good but SOAP generation is wrong, you can't retry just the generation without re-transcribing. Accepted because:
- Simpler code, fewer API calls, lower cost
- Retry endpoint re-runs the whole pipeline anyway

### 2. Background Threads vs. Celery/Task Queue

**Chosen:** Python `threading.Thread` with `daemon=True`.

**Trade-off:** Tasks are lost on server restart. Celery would persist tasks in Redis.

**Why this is acceptable:** This is a clinic-scale tool. Doctors retry failed consultations manually. Adding Celery+Redis would require an extra infrastructure component for marginal benefit.

### 3. JWT in localStorage vs. httpOnly Cookies

**Chosen:** `localStorage` for simplicity.

**Trade-off:** Vulnerable to XSS attacks. In a production EHR context, `httpOnly` cookies with `SameSite=Strict` would be required (immune to JS access).

### 4. Polling vs. WebSockets

**Chosen:** Polling every 2 seconds.

**Trade-off:** WebSockets would give true real-time updates but require a persistent connection manager. Polling is simpler, stateless, and the 2-second delay is imperceptible for a 20-40 second processing job.

### 5. Client-side PDF vs. Server-side

**Chosen:** jsPDF in the browser.

**Trade-off:** No server round-trip needed; works offline. Limitation: complex formatting (custom fonts, clinical header templates) is harder than with a server-side tool like WeasyPrint.

### 6. Monorepo vs. Separate Repos

**Chosen:** Monorepo with `frontend/` and `backend/` directories.

**Why:** Easier to develop locally, single git history, coordinated deploys. Would split into separate repos if multiple teams owned each service.

---

## 10. Performance & Scalability

### Current Bottlenecks

| Bottleneck | Impact | Solution at scale |
|---|---|---|
| Gemini API latency (15-40s per consultation) | Processing time per upload | Cannot parallelize this; cache similar transcripts |
| In-memory `_processing_tasks` dict | Lost on restart, no visibility | Replace with DB-persisted task queue (Celery + Redis) |
| Synchronous polling every 2s | N users × 2 req/s DB read load | Switch to WebSockets or Server-Sent Events |
| Local file storage in `uploads/` | Can't scale horizontally | Replace with AWS S3 / Google Cloud Storage |
| SQLite/PostgreSQL on one host | Single point of failure | Read replicas, connection pooling (PgBouncer) |

### Current Performance Profile

- Upload endpoint: < 200ms (file write + DB insert + thread spawn)
- Gemini processing: 15–40 seconds per consultation (depends on audio length)
- List endpoint with 100 consultations: < 50ms (indexed `user_id` + `created_at` DESC)

### What Would Change for Production Scale

1. **Object storage** (S3) instead of local disk for audio files
2. **Celery + Redis** for durable task queuing with retry semantics
3. **WebSockets** for real-time status (FastAPI has native WebSocket support)
4. **Horizontal scaling** with multiple FastAPI workers behind a load balancer
5. **Rate limiting** per user for the Gemini API (protect against quota exhaustion)
6. **HIPAA compliance** — at-rest encryption for audio files and transcripts, audit logs, BAA with Google

---

## 11. Interview Q&A

### General Architecture

**Q: Why did you choose FastAPI over Django/Flask?**
A: FastAPI is async-native, which matters when calling external APIs (Gemini) and doing file I/O. It also generates OpenAPI docs automatically, which speeds up development. Django is heavier and better suited for full-stack monoliths. Flask lacks async support and requires more boilerplate for data validation.

**Q: How does the app handle concurrent uploads from multiple users?**
A: Each upload spawns an independent daemon thread with its own SQLAlchemy session. The `_processing_tasks` dict tracks active consultations. With 10 concurrent uploads, you'd have 10 threads, each independently calling the Gemini API. At higher scale, this would be replaced with Celery workers.

**Q: What happens if the server restarts mid-processing?**
A: Consultations stuck in `TRANSCRIBING` or `GENERATING` status remain there. The user sees a "processing" state indefinitely. The retry endpoint manually re-triggers processing. At scale, Celery with `acks_late=True` would handle this automatically.

---

### React & Frontend

**Q: How did you handle auth without Redux?**
A: React Context + `useReducer` pattern via the `useAuth` hook. Context is appropriate for truly global state (the current user). Everything else — upload progress, recording state, consultation list filters — is local to the component that owns it.

**Q: Why is `abortControllers` stored in a `useRef` instead of `useState`?**
A: A `Map`'s mutations (`.set()`, `.delete()`) are imperative. If you store a `Map` in `useState` and mutate it, React doesn't see a new object reference and won't re-render. `useRef` is designed for values you need to persist across renders without causing re-renders — exactly right for an AbortController registry.

**Q: How does the waveform visualizer work?**
A: The `useAudioAnalyzer` hook connects the microphone `MediaStream` to a Web Audio `AnalyserNode`. A `requestAnimationFrame` loop calls `getByteFrequencyData()` which fills a `Uint8Array` with frequency amplitudes (0–255). The `WaveformVisualizer` component reads this array and draws bars on an HTML canvas, creating the live equalizer effect.

**Q: How does real-time status polling work without memory leaks?**
A: The interval is stored in a `useRef` (not state). The `useEffect` cleanup function calls `clearInterval()` on unmount. When status reaches `completed` or `failed`, polling stops early. This ensures no orphaned intervals if the user navigates away.

---

### Backend & API

**Q: How does authentication work end-to-end?**
A: Register creates a bcrypt-hashed password in the DB. Login verifies the hash and returns a HS256-signed JWT (sub = user_id, exp = 7 days). The frontend stores it in localStorage and sends it as `Authorization: Bearer <token>` on every request. FastAPI's `get_current_user` dependency decodes and validates the token and fetches the user from DB.

**Q: How do you ensure a user can only access their own consultations?**
A: Every query filters on `Consultation.user_id == current_user.id`. This is enforced at the DB query level, not just in application logic. Even if someone guesses a consultation ID, the query returns nothing if the user IDs don't match.

**Q: Why does the upload endpoint return immediately instead of waiting for processing?**
A: Gemini processing takes 15–40 seconds. If the endpoint waited, the HTTP connection would time out on many proxies/browsers (default ~30s). Returning HTTP 201 immediately with `status=pending` and letting the frontend poll is a standard async API pattern.

---

### AI & Gemini

**Q: Why use one Gemini prompt for both transcription and SOAP generation?**
A: It's simpler and cheaper. Gemini 2.0 Flash understands audio natively, so it can simultaneously transcribe what was said and understand the clinical context to structure a SOAP note. A separate transcription pass then a separate generation pass would double API costs and latency.

**Q: What if the AI generates an inaccurate SOAP note?**
A: The SOAP editor is always editable. The doctor reviews the AI-generated content and corrects any errors before signing off. The AI output is a first draft, not a final medical record.

**Q: How do you handle audio files that Gemini can't process?**
A: The background thread catches all exceptions. If Gemini returns an error (unsupported format, quota exceeded, content policy), the consultation status is set to `FAILED` and the error message is stored. The user sees the error on the detail page and can click "Retry."

---

### Database & Migrations

**Q: Why PostgreSQL over SQLite?**
A: PostgreSQL handles concurrent writes correctly — multiple doctors uploading simultaneously won't corrupt data. SQLite has write-level locking that would serialize all uploads. PostgreSQL also supports proper `TEXT` columns for long transcripts and concurrent reads.

**Q: How does Alembic track schema changes?**
A: Alembic maintains a `alembic_version` table with the current migration hash. `alembic upgrade head` compares this to the migration chain and runs any pending migrations in order. `alembic revision --autogenerate` diffs the ORM models against the live DB to generate migration scripts.

---

### Testing & Quality

**Q: How would you test this application?**

**Backend:**
- Unit tests for `gemini_service.py` — mock the Gemini SDK, test prompt construction and response parsing
- Integration tests for API endpoints with `httpx.AsyncClient` and a test PostgreSQL database
- Test the auth flow: register → login → access protected endpoint → invalid token → 401

**Frontend:**
- Unit tests for utilities (`audioRecordingUtils`, `fileValidation`, `exportUtils`) with Vitest
- Component tests with React Testing Library for `AuthModal`, `SOAPEditor`, `FileUpload`
- E2E tests with Playwright: upload flow, consultation detail polling, export

**Q: What would you monitor in production?**
- Gemini API error rate and latency (P50, P95, P99)
- Consultation processing success rate (% completed vs. failed)
- Queue depth (how many consultations in PENDING/PROCESSING state)
- API response times for list and detail endpoints
- Disk usage for `uploads/` directory

---

### Behavioral / Situational

**Q: What was the hardest technical challenge?**
A: Getting the browser audio recording to work consistently across browsers. Chrome supports `audio/webm;codecs=opus`, Firefox prefers `audio/ogg`, and Safari only supports `audio/mp4`. The solution was runtime MIME type negotiation using `MediaRecorder.isTypeSupported()` before creating the recorder, so the app picks the best format the current browser supports.

**Q: If you had two more weeks, what would you add?**
1. **Persistent task queue** (Celery + Redis) — eliminate the "lost on restart" problem
2. **WebSocket updates** — replace polling with push notifications when processing completes
3. **Audio file cleanup** — scheduled job to delete old audio files after transcription (privacy + storage cost)
4. **Multi-tenancy** — clinic-level accounts where multiple doctors share a workspace
5. **Template library** — let doctors save custom SOAP note templates for different consultation types

**Q: How did you structure the project to keep it maintainable?**
- Single-responsibility hooks (`useAudioRecorder` only records; `useAudioAnalyzer` only meters volume)
- Shared `types/index.ts` — one source of truth for TypeScript interfaces
- API calls centralized in `services/api.ts` — only one file touches the network layer
- Pydantic schemas separate from ORM models — request/response shape is independent of DB schema
- Alembic for all schema changes — no manual SQL, full audit trail
