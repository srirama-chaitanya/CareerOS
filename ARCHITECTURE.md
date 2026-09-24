# CareerOS — System Architecture

> **Interview Reference Document**  
> A complete deep-dive into the design decisions, data flows, and trade-offs behind CareerOS.

---

## 1. Why This Project Exists

Job hunting is broken for engineers. The process involves five completely separate workflows — searching for jobs, drafting outreach emails, practicing interviews, studying weak areas, and proving coding skills — all done across five different tools with no shared context.

**CareerOS solves this by treating your resume as a live context object** that is injected into every AI action — from job matching to interview simulation to study planning — through a single backend pipeline. The goal was to build something a senior engineer would actually use, not a toy demo.

The secondary goal was to demonstrate production-grade patterns: async APIs, agentic pipelines, SSE streaming, JWT auth, and a stateful multi-user backend.

---

## 2. High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                     │
│   Engine Room │ Job Radar │ Outreach │ The Forge │ Strategist │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP / SSE
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                    │
│                                                              │
│  ┌─────────────┐   ┌──────────────────────────────────────┐  │
│  │  Auth Layer │   │         LangGraph Agent Pipeline      │  │
│  │  JWT+bcrypt │   │  Router → [hunt|draft|interview       │  │
│  │  Google OAuth│  │          |evaluate|plan]              │  │
│  └─────────────┘   └──────────────┬───────────────────────┘  │
│                                   │                           │
│               ┌───────────────────▼──────────────────────┐   │
│               │        Gemini 2.5 Flash (LLM)             │   │
│               │      via LangChain Google GenAI            │   │
│               └──────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────┐  ┌──────────────────────────────┐   │
│  │   SQLite Database   │  │   JSearch API (RapidAPI)      │   │
│  │  users              │  │   async httpx client          │   │
│  │  user_resumes       │  └──────────────────────────────┘   │
│  │  interview_evals    │                                      │
│  │  study_plans        │                                      │
│  │  LangGraph checkpts │                                      │
│  └─────────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
```

**Tech Stack:**

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite), TailwindCSS |
| Backend | FastAPI (Python 3.11), Uvicorn |
| LLM | Gemini 2.5 Flash via `langchain-google-genai` |
| Agent Orchestration | LangGraph `StateGraph` |
| Database | SQLite — `sqlite3` + `langgraph-checkpoint-sqlite` |
| Auth | JWT (`PyJWT`), bcrypt (`passlib`), Google OAuth |
| Job Search | JSearch RapidAPI via `httpx` (async) |
| Streaming | Server-Sent Events (SSE) — FastAPI `StreamingResponse` |
| Email | Gmail API via `google-api-python-client` |

---

## 3. Authentication System

### 3.1 Two Login Paths

**Path 1 — Email/Password:**
1. User registers → password hashed with `bcrypt` → stored in `users` table
2. On login → hash verified → JWT issued (`HS256`)
3. Token stored in `localStorage` → sent as `Authorization: Bearer <token>` on every API call

**Path 2 — Google OAuth:**
1. Frontend uses `@react-oauth/google` → user clicks Google button → receives a Google ID token
2. Backend calls `id_token.verify_oauth2_token()` to cryptographically validate with Google's public key
3. Email extracted → user looked up or created → same JWT issued

**Every protected route uses a FastAPI dependency:**
```python
async def get_current_user(credentials = Depends(security)) -> str:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload.get("sub")  # returns user_id
```

This `user_id` is threaded through every DB query — a user can never touch another user's data.

### 3.2 Security Properties
- Passwords never stored in plain text (bcrypt with salt)
- Stateless JWT — no session server needed
- Google tokens verified server-side (not client-trusted)
- All DB queries scoped by `user_id` — `WHERE user_id = ?`

---

## 4. Database Design

### 4.1 Schema

All data lives in one SQLite file: `checkpoints.db`

```sql
-- User accounts
users (id TEXT PK, email TEXT UNIQUE, password_hash TEXT, created_at)

-- Resume storage with full extracted text
user_resumes (id TEXT PK, user_id TEXT FK, label TEXT, filename TEXT,
              is_active INTEGER DEFAULT 0, raw_text TEXT,
              UNIQUE(user_id, label))

-- Interview evaluation results
interview_evaluations (id TEXT PK, user_id TEXT FK, timestamp,
                       company TEXT, score INTEGER,
                       strengths TEXT, weaknesses TEXT,
                       recommended_study_topic TEXT)

-- AI-generated study plans (plan_data is serialized JSON)
study_plans (id TEXT PK, user_id TEXT FK, topic TEXT, goal TEXT,
             duration_days INTEGER, plan_data TEXT, created_at)

-- LangGraph conversation checkpoints (auto-managed by SqliteSaver)
checkpoints, checkpoint_blobs, checkpoint_writes
```

### 4.2 Why One SQLite File for Everything

LangGraph's `SqliteSaver` needs a live database **connection object** — not a file path. By giving it the same connection to `checkpoints.db` that the application uses, everything stays in one file. This simplifies deployment (no external DB) and backup (copy one file).

**The WAL trade-off:** SQLite in WAL (Write-Ahead Logging) mode — visible in `checkpoints.db-wal` and `checkpoints.db-shm` — allows concurrent reads while writes are in progress. However, writes are still serialized. Under many concurrent users writing simultaneously, you'd hit `database is locked`. For production: PostgreSQL with `asyncpg`.

---

## 5. LangGraph Agent Pipeline

### 5.1 What LangGraph Is

LangGraph is a graph-based orchestration framework on top of LangChain. You define a `StateGraph` where nodes are Python functions that read/write a shared typed state object, and edges define control flow. The key feature for CareerOS is **automatic state checkpointing** — the entire `AgentState` is serialized to SQLite after every node execution, giving persistent memory across HTTP calls for free.

### 5.2 The CareerOS Graph

```
AgentState (TypedDict) — shared state object
├── user_id, status, action
├── search_string, job_results        # Job Hunt
├── outreach_target_jd, outreach_draft # Cold Outreach
├── target_company, chat_history       # Mock Interview
├── evaluation_result                  # Grading
└── study_topic, study_plan            # Strategist

Conditional Entry Point
      │
      ▼  router(state) reads state["action"]
      │
      ├── "hunt"      → hunt_jobs (async)
      ├── "draft"     → draft_pitch
      ├── "interview" → interviewer_node
      ├── "evaluate"  → evaluate_interview
      └── "plan"      → generate_study_plan

Each node → END
```

### 5.3 User-Scoped Thread IDs

Every API call constructs:
```python
config = {"configurable": {"thread_id": f"{user_id}_{session_id}"}}
```

This means:
- Two users with the same session name never collide (`user_id` prefix)
- The same user's interview session is remembered across HTTP calls
- Chat history is persisted in LangGraph — the frontend doesn't need to store it permanently

### 5.4 Honest Assessment

The graph is currently a **one-shot router** — `START → one node → END`. LangGraph's real power is cyclical graphs. The architecture uses LangGraph primarily for:
1. **Free state checkpointing** — no manual serialization code
2. **Clean dispatch** — action-based routing without a giant if-else chain
3. **Extensibility** — adding feedback loops (e.g., retry job hunt if scores < 40) is just adding edges

---

## 6. Module Deep Dives

### 6.1 Engine Room — Resume Context Manager

**Flow:**
1. PDF uploaded via `multipart/form-data` → saved to `tempfile`
2. `PyPDFLoader` extracts text from all pages → joined into `raw_text`
3. Stored in `user_resumes` with a user-assigned label
4. One resume marked `is_active = 1` at a time

**Active resume switching (atomic):**
```python
cursor.execute("UPDATE user_resumes SET is_active = 0 WHERE user_id = ?", (user_id,))
cursor.execute("UPDATE user_resumes SET is_active = 1 WHERE id = ? AND user_id = ?", (resume_id, user_id))
```
Wrapped in try/except with `conn.rollback()` for application-level atomicity.

**Key design:** The `raw_text` stored here is the **context object for every module**. No module re-parses the PDF. They call `db_get_resume_text(user_id, resume_id)` and get the string.

---

### 6.2 Job Radar — AI-Powered Job Hunt

**Flow:**
1. Frontend sends `{search_string, location, job_type, experience_level, active_resume_id}`
2. Backend builds query: `f"{experience_level} {search_string} {job_type}"`
3. `hunt_jobs` (async LangGraph node) calls `search_jobs()` via `httpx.AsyncClient` — non-blocking
4. JSearch API returns raw job listings
5. **Batch match analysis:** all jobs sent in one LLM prompt with resume context
6. LLM returns JSON array: `[{job_index, match_score, reason}]`
7. Scores merged back → sorted descending by `match_score` → returned to frontend

**Why batch?** One LLM call for N jobs vs. N separate calls. Reduces latency and API cost.

**Graceful fallback:** No JSearch API key → `get_mock_jobs()` returns realistic dummy data. UI and AI matching still work for demos.

---

### 6.3 Cold Outreach Agent

**Flow:**
1. User pastes job description (or auto-filled via "Draft Outreach" button in Job Radar)
2. Selects tone: Standard / Shorter / Technical / Sarcastic
3. `draft_pitch` LangGraph node:
   - Fetches active resume from DB
   - System prompt with strict "Firewall Rules": no CGPA, no C++, first-person only
   - LLM returns raw JSON: `{subject, body}`
4. User edits draft inline, can regenerate with different modifier
5. Send: Google OAuth popup (scope: `gmail.send`) → access token → backend → Gmail API

**Why send email server-side?** Routing the Gmail API call through the backend keeps the access token off the client. The token is used once, server-side, and discarded.

---

### 6.4 The Forge — Voice-Enabled Mock Interviewer (SSE Streaming)

This is the most technically complex module.

**Full Flow:**

```
User speaks → Web Speech API (SpeechRecognition.continuous = true)
           → final transcript accumulated in fullTranscriptRef
           → user clicks stop → handleSendMessage()

POST /api/interview/chat
  {session_id, active_resume_id, target_company, new_message, chat_history}

Backend:
  1. get_current_user() extracts user_id from JWT
  2. db_get_resume_text(user_id, resume_id) → raw_text from SQLite
  3. full_history = chat_history + [new user message]
  4. stream_interview_response(resume_text, company, full_history):
       - Loads company_playbooks.json → finds company entry
       - Builds system prompt: resume context + playbook topics + persona
       - llm.astream(messages) → Gemini streams tokens
       - yields f"data: {chunk}\n\n"  ← SSE format
  5. StreamingResponse(media_type="text/event-stream")
  6. On stream complete → BackgroundTasks:
       save_chat_to_state(...) → LangGraph checkpoint to SQLite

Frontend SSE Parser:
  reader = res.body.getReader()
  rawChunk → split('\n\n') → filter lines starting with 'data: '
           → strip 'data: ' prefix → content string
  fullAssistantMessageRef.current += content

Parallel — Progressive TTS (Zero-Skip Algorithm):
  - spokenTextLength pointer tracks what's been sent to TTS
  - Each chunk: scan unspoken text for [.!?\n] boundary
  - Complete sentence found → speakText() immediately
  - Typewriter setInterval reveals text at ~100 chars/sec to sync with speech
```

**Why SSE over WebSockets?**
Interview streaming is unidirectional (server → client) during generation. SSE is a long-lived HTTP response — no protocol upgrade, no connection management. Works through proxies, reconnects automatically, simpler to implement. WebSockets add complexity that isn't needed for this pattern.

**Why BackgroundTasks for state save?**
Saving to LangGraph (a SQLite write) after the stream finishes would block the response. `BackgroundTasks` runs the save function after the response is sent — zero user-facing latency impact.

**Company Playbooks (`company_playbooks.json`):**
```json
{
  "google": {
    "interview_style": "Hostile, deeply technical, obsessed with algorithmic bounds",
    "favorite_topics": ["Distributed Systems", "Dynamic Programming", "Graph Algorithms"]
  }
}
```
Injected into the system prompt to give each company's AI a distinct interrogation style.

---

### 6.5 Strategist — AI Study Plan Generator

**Flow:**
1. Triggered manually (user inputs topic) or auto-triggered post-evaluation (recommended topic pre-filled)
2. `generate_study_plan` LangGraph node
3. Prompt enforces: `duration_days` in output must match requested days exactly
4. Uses `temperature=0.2` for creative variety vs. `temperature=0` for grading (deterministic)
5. Plan saved to `study_plans` table as serialized JSON blob
6. Unlocking: completing a Proving Grounds problem unlocks the next Strategist day

---

### 6.6 Proving Grounds — Code Evaluator

**Flow:**
1. User submits code + problem statement
2. LLM does **static analysis only** (no code execution) — time/space complexity, edge cases, pass/fail
3. Returns structured JSON:
   ```json
   {
     "pass_status": true,
     "time_complexity": "O(N log N)",
     "space_complexity": "O(N)",
     "bugs_and_edge_cases": ["..."],
     "staff_engineer_critique": "..."
   }
   ```
4. On pass → `setUnlockedDay(prev => prev + 1)` in App.jsx — gates access to next study day

**Firewall prompt pattern** (used across all structured-output endpoints):
```
Output MUST be a raw, valid JSON object. Do not wrap in markdown blocks (no ```json).
```
Then post-process: strip any ` ```json ` prefix the LLM adds despite the instruction.

---

## 7. React State Architecture

### 7.1 Why Hunt State is Hoisted to App.jsx

If `AutoHunt` owned its own state, navigating to another tab would unmount the component and destroy job results. The user would re-run the search on every tab switch.

**Solution:** Job hunt state (`jobs`, `loading`, `searchQuery`, `location`, etc.) lives in `App.jsx`. All 7 modules are mounted simultaneously — only visibility toggles:

```jsx
<div className={activeModule === 'hunt' ? 'block' : 'hidden'}>
  <AutoHunt jobs={jobs} loading={loadingHunt} ... />
</div>
```

CSS `display: none` vs. `display: block` — component stays mounted, state preserved.

### 7.2 Payload Optimization

The frontend sends only the `active_resume_id` (a UUID string) to API calls. The backend resolves the full resume text:

```python
active_resume_text = db_get_resume_text(user_id, request.active_resume_id)
```

A typical resume is 3-5KB of text. Keeping that out of every request body reduces bandwidth, especially in the interview chat where multiple messages are exchanged per session.

---

## 8. The Full Async Pipeline

```
FastAPI (async event loop)
    │
    ├── Route handlers: async def
    │       │
    │       ├── DB reads: sqlite3 (sync — acceptable, microsecond lookups)
    │       │
    │       ├── JSearch API: async httpx.AsyncClient  ← non-blocking I/O
    │       │
    │       ├── LLM streaming: llm.astream()  ← async generator
    │       │
    │       └── State saves: BackgroundTasks  ← post-response
    │
    └── SSE: StreamingResponse with async generator
```

> **Note on SQLite:** `sqlite3` doesn't have an async driver — DB calls temporarily block the event loop. This is acceptable because SQLite reads are in-process and take microseconds. Production upgrade: `aiosqlite` or migrate to PostgreSQL + `asyncpg`.

---

## 9. Trade-offs & Interview Q&A

---

### Q1: "Why SQLite and not PostgreSQL?"

SQLite was chosen for zero infrastructure overhead — no separate DB server to spin up — and because LangGraph's `SqliteSaver` integrates natively with a live connection object. For a solo portfolio project running locally, this is the correct call.

**Trade-off:** SQLite is single-writer. WAL mode mitigates read contention but writes are serialized. Under concurrent load, `database is locked` errors would appear.

**Production path:** PostgreSQL with `asyncpg` + LangGraph's Postgres checkpointer. The schema is simple relational — migration is straightforward.

---

### Q2: "You use LangGraph but have no cycles — why use it?"

Fair challenge. The current graph is a one-shot router. LangGraph is used for:
1. **Free checkpointing** — persistent per-user-session memory without writing serialization code manually
2. **Clean architecture** — action-based dispatch, no giant if-else
3. **Extensibility** — adding feedback loops is just adding edges (e.g., retry job hunt if all match scores < 40)

Without LangGraph, you'd manually serialize `AgentState` to SQLite and reload it on each request — re-implementing what you get for free.

---

### Q3: "SSE vs WebSockets — why SSE?"

Interview streaming is **unidirectional during generation** — server streams response, client reads. SSE is a long-lived HTTP response with `text/event-stream` content type. Simpler than WebSockets (no protocol upgrade, no connection management), works through proxies, auto-reconnects.

**When WebSockets would be correct:** If the client needed to send messages *while* the server is streaming (true simultaneous bidirectional chat). For the interview pattern (one message in → stream out → next message in), SSE is the right tool.

---

### Q4: "How do you prevent cross-user data access?"

Three layers:
1. **Auth:** Every request requires a valid JWT. No token = 401.
2. **Verified identity:** JWT `sub` claim contains `user_id` — extracted by `get_current_user()` injected into every route. Cannot be forged without the secret key.
3. **Query scoping:** Every DB query includes `WHERE user_id = ?` using the verified `user_id` — not any value from the request body.

Example: Even if a user guesses another's `resume_id`, `db_get_resume_text(user_id, resume_id)` returns empty because their `user_id` doesn't match the record.

---

### Q5: "What happens when the LLM returns malformed JSON?"

Three-layer defense:

**Layer 1 — Prompt instruction:** Every structured-output prompt ends with:
`"Output MUST be raw valid JSON. No markdown blocks. No ```json."`

**Layer 2 — Post-processing strip:**
```python
if raw_json.startswith("```json"):
    raw_json = raw_json[7:-3]
```

**Layer 3 — Exception handling:** `json.loads()` failure is caught, logged, and returns HTTP 500 with a user-friendly message. No crash.

**Production improvement:** Gemini's native response schema enforcement or the `instructor` library for Pydantic-validated LLM outputs — guaranteed schema compliance at the API level.

---

### Q6: "You inject resume text raw into prompts — doesn't this hit token limits?"

Acknowledged limitation. A typical resume is 500-800 tokens. Gemini 2.5 Flash has a 1M token context window — not a practical problem for single-resume injection.

**Risk at scale:** Multiple documents, large portfolios, or company knowledge bases would hit limits. The correct solution is RAG: chunk documents, embed into a vector store (FAISS/ChromaDB), retrieve top-K relevant chunks per query (~200-400 tokens instead of the whole document).

The current system is accurately **context injection**, not RAG. The database schema supports the upgrade — `raw_text` in `user_resumes` could become a `vector_store_id` pointing to a Chroma collection.

---

### Q7: "How does the typewriter + TTS sync work?"

**Problem:** Text arrives as a stream of tokens. TTS needs complete sentences to sound natural — reading one token at a time sounds robotic.

**Zero-Skip Algorithm:**
1. `fullAssistantMessageRef` accumulates the full streamed text in a React ref (not state — no re-renders on each token)
2. `spokenTextLength` pointer tracks how much has been sent to TTS
3. On each chunk: scan `unspoken = fullText.substring(spokenTextLength)` for `[.!?\n]` boundary
4. Complete sentence found → `speakText()` immediately — TTS queued
5. Advance `spokenTextLength` pointer
6. `setInterval` typewriter loop reveals text in UI at ~100 chars/sec — visually syncs with speech pace

Result: the AI appears to speak as it "thinks" — audio and text arrive progressively together.

---

### Q8: "What would you change if this went to production?"

Priority order:

| Priority | Change | Reason |
|---|---|---|
| 1 | PostgreSQL + asyncpg | Concurrent write support |
| 2 | Structured LLM output (instructor/response schema) | Eliminate JSON parse fragility |
| 3 | httpOnly cookies for JWT | Prevent XSS token theft (vs localStorage) |
| 4 | Per-user LLM rate limiting | Prevent quota exhaustion |
| 5 | LangGraph cyclical nodes | Real agentic feedback loops |
| 6 | FAISS/ChromaDB RAG | Scale to larger document sets |
| 7 | Redis caching for job results | Avoid redundant JSearch API calls for same query |

---

### Q9: "Why not use a task queue (Celery/BullMQ) for LLM calls?"

For the current architecture, LLM calls are either:
- **Streaming** (interview chat) — must be synchronous to the request lifecycle for SSE to work
- **Short-lived** (drafting, evaluation) — complete in 2-5 seconds, acceptable for direct HTTP

A task queue would be necessary if:
1. LLM calls exceeded 30s (Nginx/load balancer timeout)
2. We needed to fan out multiple LLM calls in parallel (e.g., simultaneous job matching for 50 listings)
3. We wanted background pre-computation (e.g., pre-warming context for anticipated queries)

For the current use case, FastAPI's async handling is sufficient.

---

## 10. End-to-End Data Flow — Complete Example

**Scenario: User starts a mock interview in Google mode**

```
1. User selects "Google" → clicks Start Interview
2. handleStartInterview() → handleSendMessage("Start interview")
3. POST /api/interview/chat
   {session_id: "uuid-abc", active_resume_id: "res-uuid",
    target_company: "google", new_message: "Start interview", chat_history: []}

4. get_current_user() decodes JWT → user_id = "user-xyz"
5. db_get_resume_text("user-xyz", "res-uuid") → SELECT raw_text FROM user_resumes
   WHERE id = 'res-uuid' AND user_id = 'user-xyz'
6. stream_interview_response(resume_text, "google", []) called
7. Opens company_playbooks.json → google entry loaded
   {interview_style: "Hostile, deeply technical...",
    favorite_topics: ["DP", "Distributed Systems", "Graph Algorithms"]}
8. System prompt built: resume context + playbook + "You are Alex, Senior EM at Google"
9. llm.astream(messages) → Gemini 2.5 Flash streams tokens
10. Each token: yield f"data: {token}\n\n"
11. StreamingResponse(media_type="text/event-stream") sent to client

12. Frontend:
    reader = res.body.getReader()
    chunk arrives → split('\n\n') → strip 'data: ' → content
    fullAssistantMessageRef.current += content
    Typewriter interval reveals text in UI
    TTS: "Hi, I'm Alex..." sentence detected → speakText()

13. Stream ends → BackgroundTasks executes:
    save_chat_to_state("user-xyz", "uuid-abc", resume_text, "google", final_history)
    → agent_graph.update_state(config, {chat_history: [...]})
    → LangGraph serializes state to SQLite checkpoints table

14. User speaks reply → SpeechRecognition accumulates transcript
15. User clicks stop → POST /api/interview/chat again
    {chat_history: [{role: "assistant", content: "Hi, I'm Alex..."}], new_message: "..."}
16. Cycle repeats — LangGraph thread_id = "user-xyz_uuid-abc" ties it all together
```

---

*All code references verified against source. Architecture document reflects actual implementation.*
