# CareerOS

An AI-powered career acceleration platform that unifies the entire job-hunting workflow into a single dashboard. Your resume acts as a live context object injected into every AI action — from job matching to mock interviews to study planning.

---

## Features

| Module | Description |
|---|---|
| **Engine Room** | Upload, label, and switch between multiple resumes |
| **Job Radar** | AI-powered job search with resume-match scoring against live listings |
| **Cold Outreacher** | Generate personalized cold emails with tone control and one-click Gmail send |
| **The Forge** | Voice-enabled mock interviews with company-specific AI personas and real-time streaming |
| **Strategist** | Day-by-day AI study plan generator, auto-triggered from interview results |
| **Proving Grounds** | In-browser Monaco code editor with AI static analysis *(Coming Q1 2027)* |
| **Forge History** | Persistent log of all interview sessions with scores and feedback |
| **Advocate Chat** | Floating AI assistant available across every module |

---

## Tech Stack

**Frontend:** React 19, Vite 8, TailwindCSS v4, Lucide Icons, Monaco Editor  
**Backend:** FastAPI, Python 3.11, Uvicorn  
**AI / Agents:** Gemini 2.5 Flash, LangGraph StateGraph, LangChain Google GenAI  
**Database:** SQLite with LangGraph checkpoint persistence  
**Auth:** JWT (PyJWT + bcrypt) + Google OAuth 2.0  
**Streaming:** Server-Sent Events (SSE) via FastAPI `StreamingResponse`  
**Job Search:** JSearch RapidAPI via async `httpx`  
**Email:** Gmail API via `google-api-python-client`  
**Deployment:** Render (backend), Vercel (frontend)

---

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

### Environment Variables

Copy the `.env.example` files in both `backend/` and `frontend/` and fill in:

```
# backend/.env
GEMINI_API_KEY=
JSEARCH_API_KEY=
SECRET_KEY=
GOOGLE_CLIENT_ID=

# frontend/.env
VITE_GOOGLE_CLIENT_ID=
```

> **Note:** If `JSEARCH_API_KEY` is not set, the app falls back to mock job data — all AI matching still works.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│               React Frontend (Vite + React 19)               │
│  Engine Room │ Job Radar │ The Forge │ Strategist │ Outreach  │
└─────────────────────────┬────────────────────────────────────┘
                          │  REST + SSE
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (Python 3.11)                │
│                                                              │
│   JWT + Google OAuth        LangGraph Agent Pipeline         │
│                             ├── hunt_jobs (async)            │
│                             ├── draft_pitch                  │
│                             ├── interviewer_node (SSE)       │
│                             ├── evaluate_interview           │
│                             └── generate_study_plan          │
│                                        │                     │
│                             Gemini 2.5 Flash (LLM)           │
│                                                              │
│   SQLite (checkpoints.db)          JSearch RapidAPI          │
│   users · resumes · evals          async httpx client        │
│   study_plans · LangGraph state                              │
└──────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Resume as context** — active resume text is injected into every LLM call; no module re-parses the PDF
- **LangGraph checkpointing** — full agent state serialized to SQLite after each node, giving persistent multi-session memory for free
- **SSE streaming** — interview responses stream token-by-token via `StreamingResponse`; state saved via `BackgroundTasks` after the stream closes
- **Batch LLM matching** — all job listings scored against the resume in a single prompt call
- **All modules mounted simultaneously** — CSS visibility toggle (not unmount) preserves state across tab switches

---

## Project Structure

```
CareerOS/
├── backend/
│   ├── main.py                  # All API routes and auth logic
│   ├── agents/graph.py          # LangGraph StateGraph — all agent nodes
│   ├── tools/jsearch.py         # JSearch API client with mock fallback
│   └── company_playbooks.json   # Per-company interview personas
│
└── frontend/src/
    ├── App.jsx                  # Root — auth, routing, shared state
    └── components/
        ├── EngineRoom.jsx
        ├── AutoHunt.jsx
        ├── ColdOutreacher.jsx
        ├── MockInterviewer.jsx
        ├── Strategist.jsx
        ├── ProvingGrounds.jsx
        ├── ForgeHistory.jsx
        └── AdvocateChat.jsx
```

---

## License

MIT
