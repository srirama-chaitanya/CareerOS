# CareerOS

CareerOS is an advanced, AI-powered command center designed to revolutionize the job search and interview preparation process. By leveraging large language models (LLMs), it provides personalized, context-aware tools to help candidates land their dream roles.

## Features

- **Context Engine**: Centralized hub to manage multiple resumes and profiles.
- **Job Radar (AutoHunt)**: Intelligent job matching using the JSearch API with customizable filters (Domain, Location, Job Type, Experience) matching against your active resume.
- **Mock Interviewer**: Real-time AI interviews with dynamic text-to-speech audio, utilizing Gemini 2.5 Flash for realistic, on-the-fly technical screening.
- **Strategist**: Generates customized, day-by-day study protocols and architectural deep-dives tailored to your specific goals and timeline.
- **Cold Outreacher**: Automatically drafts hyper-personalized cold emails and LinkedIn outreach messages based on your selected resume and target job descriptions.
- **Proving Grounds** *(Coming Q1 2027)*: Interactive technical evaluation environments.

## Tech Stack

- **Frontend**: React (Vite), TailwindCSS, Lucide Icons, `@react-oauth/google`
- **Backend**: Python, FastAPI, SQLite, LangGraph, Google Gemini 2.5 Flash, JWT Authentication
- **AI Infrastructure**: Custom LLM rotation pool with exponential backoff to handle rate limiting and maximize free-tier concurrency.
- **Deployment**: Configured for Render (Backend Docker container) and Vercel (Frontend).

## Local Development

### 1. Start the Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Setup
Make sure to create a `.env` file in both `frontend` and `backend` using the provided `.env.example` templates. You will need:
- Google OAuth Client ID
- Google Gemini API Keys (supports multiple keys for rotation)
- RapidAPI JSearch Key
- Secure JWT Secret

## License
MIT
