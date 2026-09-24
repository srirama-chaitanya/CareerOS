# CareerOS — Internship Project Documentation

> **Purpose:** Complete project documentation for internship reporting, resume references, and handover.  
> Covers: Project Description · Folder Structure · Architecture · Features

---

## 1. Project Description

### Overview

**CareerOS** is a full-stack, AI-powered career acceleration platform built to unify the entire job-hunting workflow into a single intelligent dashboard. It was built as a portfolio-grade, production-pattern project during an internship, demonstrating enterprise-level software engineering across a FastAPI backend, React frontend, and a LangGraph agentic pipeline.

The core idea: a job-seeker today juggles five completely separate tools — job boards, cold email drafters, interview prep apps, study plan generators, and coding practice platforms. **CareerOS collapses all of these into one** by treating the user's resume as a live context object that is injected into every AI action, from job matching to interview simulation to study planning.

---

### Problem Statement

Modern job hunting is fragmented and inefficient:
- Job boards show listings with no personalization or skill-match scoring.
- Cold outreach emails are written from scratch with no resume context.
- Mock interview practice has no memory of the user's background.
- Study plans are generic, not tailored to a user's weak areas.
- Coding practice is disconnected from the topics a user actually needs.

**CareerOS solves all five problems** with a single platform and a shared AI brain that knows who you are.

---

### What Was Built

| Module | What It Does |
|---|---|
| **Engine Room** | Resume manager — upload, label, activate, and switch resumes |
| **Job Radar** | AI-powered job hunt with resume-match scoring |
| **Cold Outreacher** | AI cold email drafter with tone control and Gmail send |
| **The Forge (Mock Interviewer)** | Voice-enabled, SSE-streamed, company-specific AI interviewer |
| **Strategist** | AI study plan generator (auto-triggered post-interview) |
| **Proving Grounds** | In-browser code editor with AI static code evaluation |
| **Forge History** | Persistent interview session log with per-turn feedback |
| **Advocate Chat** | Floating AI assistant available from any module |

---

### Technical Highlights

- **LangGraph StateGraph** agent with automatic SQLite checkpointing for multi-session memory
- **Server-Sent Events (SSE)** for real-time token-by-token LLM streaming in the interview module
- **Web Speech API** for voice input with a custom Zero-Skip TTS sync algorithm
- **Dual Auth** — Email/Password (JWT + bcrypt) and Google OAuth 2.0
- **Async architecture** — FastAPI + httpx AsyncClient + LLM astream + BackgroundTasks
- **Batch LLM match analysis** — all job results scored in a single prompt call

---

## 2. Folder Structure

```
CareerOS/
│
├── ARCHITECTURE.md                  # Full technical deep-dive (interview reference)
├── commands.txt                     # Quick-start commands for backend & frontend
├── .gitignore
│
├── backend/                         # Python FastAPI Application
│   ├── main.py                      # All API routes, auth logic, DB helpers (~23KB)
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # Environment variables (API keys, secrets)
│   ├── company_playbooks.json       # Per-company interview personas & topic guides
│   ├── checkpoints.db               # SQLite database (app data + LangGraph state)
│   ├── checkpoints.db-shm           # SQLite WAL shared memory file
│   ├── checkpoints.db-wal           # SQLite WAL write-ahead log
│   ├── backend.log                  # Server runtime log
│   ├── test_invoke.py               # Manual LangGraph invocation test
│   ├── test_jsearch.py              # JSearch API connectivity test
│   │
│   ├── agents/
│   │   └── graph.py                 # LangGraph StateGraph definition & all agent nodes
│   │
│   ├── tools/
│   │   └── jsearch.py               # JSearch RapidAPI client (async httpx wrapper)
│   │
│   └── venv/                        # Python virtual environment (not committed)
│
└── frontend/                        # React + Vite Application
    ├── index.html                   # HTML entry point
    ├── package.json                 # npm dependencies & scripts
    ├── vite.config.js               # Vite build configuration
    ├── eslint.config.js             # ESLint rules
    ├── .env                         # Frontend env vars (Google Client ID)
    ├── .gitignore
    ├── frontend.log                 # Dev server log
    │
    ├── public/                      # Static assets (favicon, etc.)
    ├── dist/                        # Production build output (not committed)
    ├── node_modules/                # npm packages (not committed)
    │
    └── src/
        ├── main.jsx                 # React entry point (mounts App)
        ├── App.jsx                  # Root component — auth gate, routing, hoisted state
        ├── App.css                  # Global app styles
        ├── index.css                # Tailwind base/reset
        │
        ├── assets/                  # Images and static media
        │
        └── components/
            ├── Login.jsx            # Auth UI — Email/Password + Google OAuth
            ├── Sidebar.jsx          # Navigation sidebar with module icons
            ├── EngineRoom.jsx       # Resume upload, label, activate manager
            ├── AutoHunt.jsx         # Job search + AI match scoring UI
            ├── ColdOutreacher.jsx   # Cold email drafter + Gmail sender
            ├── MockInterviewer.jsx  # Voice-enabled AI interview chat (SSE)
            ├── Strategist.jsx       # AI study plan viewer + day unlocking
            ├── ProvingGrounds.jsx   # Monaco code editor + AI code evaluator
            ├── ForgeHistory.jsx     # Interview session history log
            └── AdvocateChat.jsx     # Floating AI assistant widget
```

### Key Files Explained

| File | Role |
|---|---|
| `backend/main.py` | The entire API surface — auth routes, resume routes, hunt, outreach, interview, evaluation, study plans. Single file by design for portfolio clarity. |
| `backend/agents/graph.py` | LangGraph `StateGraph` — defines `AgentState`, all five agent nodes, and the conditional routing logic. |
| `backend/tools/jsearch.py` | Thin async wrapper around the JSearch RapidAPI. Falls back to mock data if no API key. |
| `backend/company_playbooks.json` | JSON config file with interview styles and topic areas for companies like Google, Amazon, Microsoft. Injected into the AI system prompt to personalize the mock interview. |
| `backend/checkpoints.db` | The single SQLite database holding all user data, resumes, evaluations, study plans, AND LangGraph conversation state. |
| `frontend/src/App.jsx` | Root component. Handles auth state, token persistence, resume state, and all cross-module data that must survive tab switching (hunt results, outreach context, unlocked study days). |

---

## 3. Architecture

### 3.1 High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite + React 19)             │
│                                                                  │
│  Engine Room │ Job Radar │ Outreach │ The Forge │ Strategist     │
│  Proving Grounds │ Forge History │ Advocate Chat                 │
└──────────────────────────┬───────────────────────────────────────┘
                           │  HTTP (REST) + SSE (streaming)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python 3.11)                  │
│                                                                  │
│  ┌────────────────┐   ┌──────────────────────────────────────┐   │
│  │  Auth Layer    │   │         LangGraph Agent Pipeline      │   │
│  │  JWT + bcrypt  │   │                                      │   │
│  │  Google OAuth  │   │  Router → hunt_jobs                  │   │
│  └────────────────┘   │          draft_pitch                 │   │
│                        │          interviewer_node            │   │
│                        │          evaluate_interview          │   │
│                        │          generate_study_plan         │   │
│                        └──────────────┬───────────────────────┘  │
│                                       │                           │
│                    ┌──────────────────▼────────────────────────┐ │
│                    │      Gemini 2.5 Flash (Google LLM)         │ │
│                    │      via LangChain Google GenAI            │ │
│                    └───────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────┐   ┌───────────────────────────────┐   │
│  │   SQLite Database    │   │   JSearch API (RapidAPI)       │   │
│  │  users               │   │   async httpx.AsyncClient      │   │
│  │  user_resumes        │   └───────────────────────────────┘   │
│  │  interview_evals     │                                        │
│  │  study_plans         │                                        │
│  │  LangGraph checkpts  │                                        │
│  └──────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend Framework** | React + Vite | React 19, Vite 8 |
| **Frontend Styling** | TailwindCSS | v4 |
| **Code Editor (UI)** | Monaco Editor (`@monaco-editor/react`) | v4.7 |
| **Auth (Frontend)** | Google OAuth (`@react-oauth/google`), JWT decode | — |
| **Icons** | Lucide React | — |
| **Backend Framework** | FastAPI + Uvicorn | 0.115 / 0.34 |
| **LLM** | Gemini 2.5 Flash | via `langchain-google-genai` |
| **Agent Orchestration** | LangGraph `StateGraph` | latest |
| **State Persistence** | `langgraph-checkpoint-sqlite` | latest |
| **Database** | SQLite (`sqlite3`) | built-in |
| **Auth (Backend)** | PyJWT + passlib (bcrypt) + Google OAuth verify | — |
| **Job Search API** | JSearch via RapidAPI | async `httpx` |
| **Streaming** | Server-Sent Events (SSE) — `StreamingResponse` | — |
| **Email Sending** | Gmail API via `google-api-python-client` | — |
| **PDF Parsing** | `PyPDFLoader` (`langchain-community`) | — |
| **Async HTTP** | `httpx.AsyncClient` | — |

---

### 3.3 Authentication System

**Two Login Paths:**

**Path 1 — Email/Password:**
1. User registers → password hashed with `bcrypt` → stored in `users` table
2. On login → hash compared → JWT issued (`HS256`, 30-day expiry)
3. Token stored in `localStorage` → sent as `Authorization: Bearer <token>` on every API call

**Path 2 — Google OAuth:**
1. Frontend (`@react-oauth/google`) → user clicks Google button → receives Google ID token
2. Backend calls `id_token.verify_oauth2_token()` to cryptographically validate against Google's public key
3. Email extracted → user looked up or auto-created → same JWT issued

**Security Properties:**
- Passwords never stored in plain text — bcrypt with automatic salt
- Stateless JWT — no session server required
- Google tokens verified server-side (not client-trusted)
- All DB queries scoped to `user_id` — `WHERE user_id = ?`

---

### 3.4 Database Schema (SQLite)

All data lives in one file: `backend/checkpoints.db`

```sql
-- User accounts
users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE,
    password_hash TEXT,
    created_at  TIMESTAMP
)

-- Resume storage — one user can have many labeled resumes
user_resumes (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id),
    label       TEXT,
    filename    TEXT,
    is_active   INTEGER DEFAULT 0,   -- only one active at a time
    raw_text    TEXT,                -- full extracted PDF text
    UNIQUE(user_id, label)
)

-- Interview session evaluation results
interview_evaluations (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id),
    timestamp   TIMESTAMP,
    company     TEXT,
    score       INTEGER,
    strengths   TEXT,
    weaknesses  TEXT,
    recommended_study_topic TEXT
)

-- AI-generated study plans (plan_data is JSON blob)
study_plans (
    id              TEXT PRIMARY KEY,
    user_id         TEXT REFERENCES users(id),
    topic           TEXT,
    goal            TEXT,
    duration_days   INTEGER,
    plan_data       TEXT,
    created_at      TIMESTAMP
)

-- Auto-managed by LangGraph SqliteSaver
checkpoints, checkpoint_blobs, checkpoint_writes
```

---

### 3.5 LangGraph Agent Pipeline

**What is LangGraph?**  
LangGraph is a graph-based orchestration framework on top of LangChain. Nodes are Python functions that read/write a shared typed state object. Edges define control flow. The key power is **automatic state checkpointing** — the full `AgentState` is serialized to SQLite after every node, giving persistent memory across HTTP requests for free.

**The CareerOS StateGraph:**

```
AgentState (TypedDict)
├── user_id, status, action
├── search_string, job_results         ← Job Radar
├── outreach_target_jd, outreach_draft ← Cold Outreacher
├── target_company, chat_history       ← The Forge
├── evaluation_result                  ← Interview Evaluator
└── study_topic, study_plan            ← Strategist

Conditional Entry:
   state["action"] → router()
        │
        ├── "hunt"      → hunt_jobs (async)
        ├── "draft"     → draft_pitch
        ├── "interview" → interviewer_node
        ├── "evaluate"  → evaluate_interview
        └── "plan"      → generate_study_plan
```

**User-Scoped Thread IDs:**
```python
config = {"configurable": {"thread_id": f"{user_id}_{session_id}"}}
```
Two users never collide. The same user's interview is remembered across HTTP calls.

---

### 3.6 The Full Async Pipeline

```
FastAPI (async event loop)
    │
    ├── Route handlers: async def
    │       │
    │       ├── DB reads: sqlite3 (sync — in-process, microsecond)
    │       │
    │       ├── JSearch API: httpx.AsyncClient   ← non-blocking I/O
    │       │
    │       ├── LLM streaming: llm.astream()     ← async generator
    │       │
    │       └── State saves: BackgroundTasks      ← post-response (zero latency impact)
    │
    └── SSE: StreamingResponse with async generator
```

---

### 3.7 SSE Streaming + Voice Sync (The Forge)

This is the most technically complex component of the system.

```
User speaks → Web Speech API (continuous recognition)
           → transcript accumulated in fullTranscriptRef (React ref, not state)
           → user clicks Stop → handleSendMessage()

POST /api/interview/chat
  { session_id, active_resume_id, target_company, new_message, chat_history }

Backend:
  1. get_current_user()  → extracts user_id from JWT
  2. db_get_resume_text() → fetches raw_text from SQLite
  3. stream_interview_response() called:
       - Loads company_playbooks.json → company persona injected
       - Builds system prompt: resume + playbook + "You are Alex, Senior EM at Google"
       - llm.astream(messages) → Gemini streams tokens
       - yields f"data: {chunk}\n\n"     ← SSE format
  4. StreamingResponse(media_type="text/event-stream")
  5. Stream ends → BackgroundTask: save_chat_to_state() → LangGraph checkpoint

Frontend SSE Parser:
  reader = res.body.getReader()
  rawChunk → split('\n\n') → filter 'data: ' lines → strip prefix → content
  fullAssistantMessageRef.current += content

Parallel — Zero-Skip TTS Algorithm:
  - spokenTextLength pointer tracks what's already been sent to TTS
  - Each chunk: scan unspoken text for [.!?\n] sentence boundary
  - Complete sentence found → speakText() immediately
  - setInterval typewriter reveals text at ~100 chars/sec to sync with speech pace
```

**Why SSE over WebSockets?** Interview streaming is unidirectional — server streams to client during generation. SSE is a standard long-lived HTTP response. No protocol upgrade, works through all proxies, auto-reconnects. WebSockets would add complexity that isn't needed for this one-way stream pattern.

---

### 3.8 React State Architecture

**Why hunt state is hoisted to App.jsx:**  
If `AutoHunt` owned its own state, navigating to another tab would unmount it and destroy the job results. To preserve state across tab switches, all seven modules are mounted simultaneously — only CSS visibility toggles:

```jsx
<div className={activeModule === 'hunt' ? 'block' : 'hidden'}>
  <AutoHunt jobs={jobs} loading={loadingHunt} ... />
</div>
```

**Payload optimization:**  
The frontend sends only the `active_resume_id` (a UUID string) to all API calls. The backend resolves the full resume text from the DB. A typical resume is 3–5 KB — keeping it out of every request body reduces bandwidth, especially in multi-turn interview chats.

---

## 4. Features

### Feature 1 — Engine Room (Resume Manager)

**What it does:**  
The Engine Room is the central context hub for the entire platform. Users upload their resumes as PDFs, assign them labels (e.g., "Software Engineer", "ML Intern"), and set one as active. Every other module uses the active resume as AI context.

**How it works:**
1. PDF uploaded via `multipart/form-data` → saved to `tempfile`
2. `PyPDFLoader` extracts text from all pages → joined into `raw_text`
3. Stored in `user_resumes` table with user-assigned label
4. Atomic resume switching (prevents data race):
   ```python
   cursor.execute("UPDATE user_resumes SET is_active = 0 WHERE user_id = ?", (user_id,))
   cursor.execute("UPDATE user_resumes SET is_active = 1 WHERE id = ? AND user_id = ?", (resume_id, user_id))
   ```
5. The `raw_text` field becomes the shared context object for all AI modules

**Key Design Decision:** No module re-parses the PDF. They all call `db_get_resume_text(user_id, resume_id)` and receive the extracted string.

---

### Feature 2 — Job Radar (AI-Powered Job Hunt)

**What it does:**  
Users enter a role title, location, job type, and experience level. CareerOS fetches live job listings from the JSearch RapidAPI and runs a batch AI analysis to score every listing against the user's active resume.

**How it works:**
1. Frontend sends `{ search_string, location, job_type, experience_level, active_resume_id }`
2. Backend builds query: `"{experience_level} {search_string} {job_type}"`
3. `hunt_jobs` async LangGraph node calls JSearch API via `httpx.AsyncClient` — non-blocking
4. **Batch match analysis:** all job listings sent to Gemini in a single prompt with resume context
5. LLM returns: `[{ job_index, match_score, reason }]`
6. Scores merged back → sorted descending by `match_score` → returned to UI

**Why batch?** One LLM call for N jobs vs. N separate calls — dramatically reduces latency and API cost.

**Graceful fallback:** If no JSearch API key is configured, `get_mock_jobs()` returns realistic dummy listings. The UI and AI matching still work fully for demos.

**One-click outreach:** Each job card has a "Draft Outreach" button that auto-fills the Cold Outreacher with the job description and switches modules.

---

### Feature 3 — Cold Outreacher (AI Email Drafter + Gmail Sender)

**What it does:**  
Users paste a job description (or use the auto-fill from Job Radar) and select a tone modifier. CareerOS generates a personalized cold outreach email using the user's active resume as context, then sends it via Gmail.

**Tone Options:** Standard · Shorter · Technical · Sarcastic

**How it works:**
1. User selects tone and target JD
2. `draft_pitch` LangGraph node:
   - Fetches active resume from DB
   - System prompt includes strict "Firewall Rules": no CGPA, no C++, first-person only
   - LLM returns JSON: `{ subject, body }`
3. User edits draft inline, can regenerate with any tone modifier
4. Send flow: Google OAuth popup (scope: `gmail.send`) → access token → backend → Gmail API → email sent

**Why send server-side?** Routing the Gmail API call through the backend keeps the OAuth access token off the client. It is used once, server-side, and discarded.

---

### Feature 4 — The Forge (Voice-Enabled Mock Interviewer)

**What it does:**  
A full AI mock interview experience. Users select a company (Google, Amazon, Microsoft, etc.), speak their answers using the browser's microphone, and receive streaming text + voice responses from a company-persona AI interviewer. Sessions are persisted across browser reloads via LangGraph checkpointing.

**Technical Implementation:**
- **Voice Input:** Web Speech API (`SpeechRecognition.continuous = true`)
- **Streaming Output:** SSE (`StreamingResponse` + `llm.astream()`)
- **TTS Sync:** Zero-Skip Algorithm — sentence boundary detection + `setInterval` typewriter reveal
- **Company Personas:** Injected from `company_playbooks.json` into the system prompt
- **Memory:** Full `chat_history` persisted to SQLite via LangGraph `BackgroundTask`
- **Session Isolation:** Thread ID = `{user_id}_{session_id}` — per-user, per-session

**Company Playbooks (example):**
```json
{
  "google": {
    "interview_style": "Hostile, deeply technical, obsessed with algorithmic bounds",
    "favorite_topics": ["Distributed Systems", "Dynamic Programming", "Graph Algorithms"]
  }
}
```

**Post-interview:** The AI evaluates the session, assigns a score (0–100), identifies strengths/weaknesses, and recommends a study topic — automatically pre-filling the Strategist module.

---

### Feature 5 — Strategist (AI Study Plan Generator)

**What it does:**  
Generates a structured, day-by-day study plan for any technical topic. Can be triggered manually or auto-filled with the recommended topic from a completed mock interview evaluation.

**How it works:**
1. User inputs topic, goal, and duration (e.g., "Dynamic Programming, crack Google, 7 days")
2. `generate_study_plan` LangGraph node
3. Prompt enforces `duration_days` matches exactly the requested days
4. Uses `temperature=0.2` for creative variety
5. Plan saved to `study_plans` table as JSON blob
6. Day progression locked — completing a Proving Grounds problem unlocks the next day

---

### Feature 6 — Proving Grounds (In-Browser Code Evaluator)

**What it does:**  
A full in-browser coding environment using Monaco Editor (the same editor as VS Code). Users write solutions to AI-generated problems from their Strategist plan and get detailed AI feedback.

**How it works:**
1. User writes code in Monaco Editor (supports multiple languages)
2. Submits code + problem statement
3. LLM performs **static code analysis** (no sandboxed execution):
   - Time & space complexity
   - Bug and edge case detection
   - Senior engineer critique
4. Returns structured JSON:
   ```json
   {
     "pass_status": true,
     "time_complexity": "O(N log N)",
     "space_complexity": "O(N)",
     "bugs_and_edge_cases": ["Does not handle empty input"],
     "staff_engineer_critique": "..."
   }
   ```
5. On pass → `unlockedDay` incremented in App.jsx → next Strategist day unlocked

**Firewall Prompt Pattern** (used across all structured-output endpoints):
```
Output MUST be a raw, valid JSON object. Do not wrap in markdown blocks (no ```json).
```
Post-processing strips any ` ```json ` prefix the LLM adds despite the instruction.

---

### Feature 7 — Forge History (Interview Session Log)

**What it does:**  
A persistent log of all past interview sessions. Each session shows the company, timestamp, final score, strengths, weaknesses, and the recommended study topic. Users can click any session to jump directly to the Strategist with that topic pre-filled.

---

### Feature 8 — Advocate Chat (Floating AI Assistant)

**What it does:**  
A floating chat widget available from every module. Acts as a general-purpose AI assistant — users can ask career questions, get resume tips, or clarify platform features without leaving their current workflow.

---

## 5. API Reference (Key Endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user (email/password) |
| `POST` | `/api/auth/login` | Login, receive JWT |
| `POST` | `/api/auth/google` | Google OAuth login |
| `GET` | `/api/resumes` | List user's resumes |
| `POST` | `/api/resumes/upload` | Upload + parse a new PDF resume |
| `DELETE` | `/api/resumes/{id}` | Delete a resume |
| `POST` | `/api/resumes/{id}/activate` | Set active resume |
| `POST` | `/api/hunt` | Run AI-powered job hunt |
| `POST` | `/api/outreach/draft` | Generate cold email draft |
| `POST` | `/api/outreach/send` | Send email via Gmail API |
| `POST` | `/api/interview/chat` | Send interview message, receive SSE stream |
| `POST` | `/api/interview/evaluate` | Evaluate and score a completed interview |
| `GET` | `/api/interview/history` | Fetch all past evaluation records |
| `POST` | `/api/study-plan/generate` | Generate an AI study plan |
| `GET` | `/api/study-plan/list` | List saved study plans |
| `POST` | `/api/code/evaluate` | Submit code for AI static analysis |

---

## 6. How to Run Locally

### Backend (FastAPI + LangGraph)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

### Environment Variables

**`backend/.env`:**
```
GEMINI_API_KEY=your_gemini_api_key
JSEARCH_API_KEY=your_jsearch_rapidapi_key
SECRET_KEY=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

**`frontend/.env`:**
```
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

---

## 7. Key Design Decisions & Trade-offs

| Decision | Reason | Trade-off |
|---|---|---|
| SQLite instead of PostgreSQL | Zero infrastructure overhead; LangGraph `SqliteSaver` integrates natively with a live connection object | Single-writer; `database is locked` under concurrent write load |
| LangGraph for one-shot routing | Free state checkpointing; clean action-based dispatch; easy to add feedback loops later | Overhead of a graph framework for what is currently a simple router |
| SSE instead of WebSockets | Interview streaming is unidirectional; SSE works through proxies, auto-reconnects, no protocol upgrade | Cannot push server messages while client is typing (bidirectional real-time) |
| Raw context injection (not RAG) | Simple to implement; resumes are 500–800 tokens; Gemini has 1M token context | Does not scale to large document portfolios |
| `BackgroundTasks` for state saves | Zero latency impact on SSE responses | Write happens after response — if server crashes mid-stream, last state may not be saved |
| All modules mounted simultaneously | Preserves state across tab switches (no unmount/remount) | Higher initial memory footprint |
| Batch LLM job matching | One API call for N jobs vs. N calls | Context window grows with number of jobs |

---

## 8. Production Upgrade Path

| Priority | Upgrade | Reason |
|---|---|---|
| 1 | PostgreSQL + asyncpg | Concurrent write support at scale |
| 2 | Structured LLM output (Gemini response schema / `instructor` library) | Eliminate JSON parse fragility |
| 3 | httpOnly cookies for JWT | Prevent XSS token theft (vs localStorage) |
| 4 | Per-user LLM rate limiting | Prevent quota exhaustion |
| 5 | LangGraph cyclical nodes | True agentic feedback loops (e.g., retry hunt if all scores < 40) |
| 6 | FAISS / ChromaDB RAG | Scale to larger document sets |
| 7 | Redis caching for job results | Avoid redundant JSearch API calls for identical queries |
| 8 | Sandboxed code execution (Judge0 / Piston API) | Replace static LLM analysis with actual code execution |

---

*Document generated: August 2026 | Project: CareerOS | Author: Srirama Chaitanya*
