from fastapi import FastAPI, UploadFile, File, HTTPException, Form, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager
import logging
import os
import base64
import uuid
import tempfile
import json
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from google.oauth2.credentials import Credentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from langchain_community.document_loaders import PyPDFLoader
from googleapiclient.discovery import build
import jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

from db.database import (
    get_checkpointer,
    db_create_user,
    db_get_user_by_email,
    db_save_resume,
    db_get_all_resumes,
    db_set_active_resume,
    db_delete_resume,
    db_get_active_resume_id,
    db_get_resume_text,
    db_save_evaluation,
    db_get_all_evaluations,
    db_delete_evaluation,
    db_save_study_plan,
    db_get_all_study_plans,
    db_delete_study_plan
)
from agents.graph import get_graph, stream_interview_response
from tools.llm_pool import invoke_with_retry_sync
from langchain_core.messages import HumanMessage

logging.basicConfig(level=logging.INFO)

# Global references — set inside lifespan
checkpointer = None
agent_graph = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Open AsyncSqliteSaver as a proper async context manager at startup."""
    global checkpointer, agent_graph
    async with get_checkpointer() as cp:
        checkpointer = cp
        agent_graph = get_graph(cp)
        logging.info("CareerOS: AsyncSqliteSaver checkpointer initialized.")
        yield
    logging.info("CareerOS: Checkpointer shut down cleanly.")

app = FastAPI(title="CareerOS API", lifespan=lifespan)

# Public health check — no auth required, used by Render/Railway & Docker HEALTHCHECK
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Allow CORS for frontend — set ALLOWED_ORIGINS env var in production
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Configuration ---
_raw_secret = os.environ.get("SECRET_KEY", "")
if not _raw_secret:
    raise RuntimeError("SECRET_KEY environment variable is not set. Refusing to start.")
SECRET_KEY = _raw_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = int(os.environ.get("ACCESS_TOKEN_EXPIRE_DAYS", "7"))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

# --- Pydantic Models ---
class AuthRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str

class ChatRequest(BaseModel):
    message: str

class StateUpdateRequest(BaseModel):
    trigger_analysis: Optional[bool] = True

class HuntRequest(BaseModel):
    search_string: str
    active_resume_id: Optional[str] = None
    location: Optional[str] = "remote"
    job_type: Optional[str] = "full-time"
    experience_level: Optional[str] = ""
    extra_info: Optional[str] = ""

class DraftRequest(BaseModel):
    job_description: str
    modifier: Optional[str] = ""

class InterviewChatRequest(BaseModel):
    session_id: str
    active_resume_id: str
    target_company: str
    new_message: str
    chat_history: list

class InterviewEvaluationRequest(BaseModel):
    chat_history: list
    target_company: Optional[str] = "Generic"

class SendEmailRequest(BaseModel):
    recipient_email: str
    subject: str
    body: str
    access_token: str

class CodeEvaluationRequest(BaseModel):
    problem_statement: str
    user_code: str

class ActiveResumeRequest(BaseModel):
    resume_id: str

class StrategistPlanRequest(BaseModel):
    topic: str
    duration_days: int = 3
    goal: str = "revision"


# --- Authentication Routes ---
@app.post("/api/auth/register")
async def register_user(request: AuthRequest):
    existing_user = db_get_user_by_email(request.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(request.password)
    db_create_user(user_id, request.email, hashed_password)
    
    token = create_access_token({"sub": user_id})
    return {"status": "success", "token": token, "user_id": user_id, "email": request.email}

@app.post("/api/auth/login")
async def login_user(request: AuthRequest):
    user = db_get_user_by_email(request.email)
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["id"]})
    return {"status": "success", "token": token, "user_id": user["id"], "email": user["email"]}

@app.post("/api/auth/google")
async def google_login(request: GoogleAuthRequest):
    try:
        # In production, replace the client_id with your actual Google Client ID
        # For testing without strict client_id validation, we let google-auth verify the signature.
        id_info = id_token.verify_oauth2_token(
            request.credential, 
            google_requests.Request(),
            clock_skew_in_seconds=60
        )
        email = id_info.get('email')
        
        if not email:
            raise HTTPException(status_code=400, detail="Google token does not contain an email")
            
        user = db_get_user_by_email(email)
        if not user:
            # First time Google login, create a user without a password
            user_id = str(uuid.uuid4())
            db_create_user(user_id, email, password_hash=None)
        else:
            user_id = user["id"]
            
        token = create_access_token({"sub": user_id})
        return {"status": "success", "token": token, "user_id": user_id, "email": email}
    except Exception as e:
        logging.error(f"Google auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google Authentication")

# --- Protected API Routes ---
@app.post("/api/chat")
async def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    return {"reply": "connection successful"}

@app.get("/api/state")
async def get_state(thread_id: str = "default_user", user_id: str = Depends(get_current_user)):
    # Scope LangGraph state to the user
    config = {"configurable": {"thread_id": f"{user_id}_{thread_id}"}}
    state_snapshot = agent_graph.get_state(config)
    
    if state_snapshot.values:
        return state_snapshot.values
    return {"status": "ready"}

@app.post("/api/state")
async def update_state(request: StateUpdateRequest, thread_id: str = "default_user", user_id: str = Depends(get_current_user)):
    config = {"configurable": {"thread_id": f"{user_id}_{thread_id}"}}
    update_data = {}
    logging.info(f"Generating insight for {user_id}_{thread_id} via RAG")
    result = agent_graph.invoke(update_data, config=config)
    return result

@app.post("/api/hunt")
async def trigger_hunt(request: HuntRequest, thread_id: str = "engineer_1", user_id: str = Depends(get_current_user)):
    config = {"configurable": {"thread_id": f"{user_id}_{thread_id}"}}
    active_resume_text = db_get_resume_text(user_id, request.active_resume_id) if request.active_resume_id else ""
    
    update_data = {
        "action": "hunt",
        "search_string": request.search_string,
        "active_resume_id": request.active_resume_id,
        "active_resume_text": active_resume_text,
        "location": request.location,
        "job_type": request.job_type,
        "experience_level": request.experience_level,
        "extra_info": request.extra_info
    }
    
    logging.info(f"Triggering Smart Job Hunt for {user_id}_{thread_id} with query: {request.search_string}")
    result = await agent_graph.ainvoke(update_data, config=config)
    return {"jobs": result.get("job_results", [])}

@app.post("/api/upload")
async def upload_resume(label: str = Form(...), file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    resume_id = str(uuid.uuid4())
    sanitized_label = label.strip().title()
    try:
        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            tmp_file.write(contents)
            tmp_path = tmp_file.name
        
        loader = PyPDFLoader(tmp_path)
        docs = loader.load()
        raw_text = "\n".join([doc.page_content for doc in docs])
        os.remove(tmp_path)
        
        db_save_resume(user_id, resume_id, sanitized_label, file.filename, raw_text.strip())
        
        return {
            "status": "success", 
            "message": "Resume uploaded successfully.",
            "resume_id": resume_id
        }
    except Exception as e:
        logging.error(f"Error processing resume: {str(e)}")
        try:
            db_delete_resume(user_id, resume_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")

@app.get("/api/status")
async def get_system_status(user_id: str = Depends(get_current_user)):
    active_id = db_get_active_resume_id(user_id)
    return {
        "resume_loaded": bool(active_id),
        "active_resume_id": active_id
    }

@app.get("/api/resumes")
async def get_resumes(user_id: str = Depends(get_current_user)):
    try:
        return db_get_all_resumes(user_id)
    except Exception as e:
        logging.error(f"Error fetching resumes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/resumes/active")
async def set_active_resume(request: ActiveResumeRequest, user_id: str = Depends(get_current_user)):
    try:
        db_set_active_resume(user_id, request.resume_id)
        return {"status": "success", "message": "Active resume updated successfully."}
    except Exception as e:
        logging.error(f"Error setting active resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/resumes/{resume_id}")
async def delete_resume(resume_id: str, user_id: str = Depends(get_current_user)):
    try:
        db_delete_resume(user_id, resume_id)
        return {"status": "success", "message": "Resume deleted successfully."}
    except Exception as e:
        logging.error(f"Error deleting resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/draft")
async def draft_email(request: DraftRequest, user_id: str = Depends(get_current_user)):
    # Use a unique thread_id to avoid memory leaks or checkpoint versioning errors for stateless calls
    config = {"configurable": {"thread_id": f"{user_id}_draft_{uuid.uuid4().hex}"}}
    update_data = {
        "user_id": user_id,
        "action": "draft",
        "outreach_target_jd": request.job_description,
        "draft_modifier": request.modifier
    }

    try:
        result = await agent_graph.ainvoke(update_data, config=config)

        return {
            "subject": result.get("outreach_subject", "Software Engineering Opportunity"),
            "body": result.get("outreach_draft", "")
        }
    except Exception as e:
        logging.error(f"Error drafting: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/strategist/plan")
async def generate_strategist_plan(request: StrategistPlanRequest, user_id: str = Depends(get_current_user)):
    # Use a unique thread_id to avoid memory leaks or checkpoint versioning errors for stateless calls
    config = {"configurable": {"thread_id": f"{user_id}_strategist_{uuid.uuid4().hex}"}}
    
    update_data = {
        "action": "plan",
        "study_topic": request.topic,
        "study_goal": request.goal,
        "duration_days": request.duration_days
    }
    
    logging.info(f"Generating {request.duration_days}-day study plan for {user_id} regarding '{request.topic}'")
    
    try:
        result = await agent_graph.ainvoke(update_data, config=config)
        plan_data = result.get("study_plan", {})
        
        # Save to DB
        plan_id = str(uuid.uuid4())
        db_save_study_plan(
            user_id=user_id,
            plan_id=plan_id,
            topic=request.topic,
            goal=request.goal,
            duration_days=request.duration_days,
            plan_data=json.dumps(plan_data)
        )
        
        return {"id": plan_id, "plan": plan_data}
    except Exception as e:
        logging.error(f"Error generating study plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/strategist/plans")
async def get_study_plans(user_id: str = Depends(get_current_user)):
    try:
        plans = db_get_all_study_plans(user_id)
        # Parse plan_data JSON string back to dict
        for p in plans:
            if "plan_data" in p and p["plan_data"]:
                p["plan"] = json.loads(p["plan_data"])
                del p["plan_data"]
        return plans
    except Exception as e:
        logging.error(f"Error fetching study plans: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch study plans.")

@app.delete("/api/strategist/plans/{plan_id}")
async def delete_study_plan(plan_id: str, user_id: str = Depends(get_current_user)):
    try:
        success = db_delete_study_plan(user_id, plan_id)
        if not success:
            raise HTTPException(status_code=404, detail="Study plan not found.")
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Error deleting study plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def save_chat_to_state(user_id: str, session_id: str, active_resume_text: str, target_company: str, chat_history: list):
    try:
        config = {"configurable": {"thread_id": f"{user_id}_{session_id}"}}
        update_data = {
            "action": "interview",
            "active_resume_text": active_resume_text,
            "target_company": target_company,
            "chat_history": chat_history
        }
        app_graph = get_graph(checkpointer)
        app_graph.update_state(config, update_data)
        logging.info(f"Asynchronously saved interview chat state to LangGraph for session {user_id}_{session_id}.")
    except Exception as e:
        logging.error(f"Error saving chat state: {e}")

@app.post("/api/interview/chat")
async def start_interview_chat(request: InterviewChatRequest, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    active_resume_text = db_get_resume_text(user_id, request.active_resume_id) if request.active_resume_id else ""
    full_history = request.chat_history + [{"role": "user", "content": request.new_message}]
    
    async def event_stream():
        full_response = ""
        try:
            generator = stream_interview_response(active_resume_text, request.target_company, full_history)
            async for chunk in generator:
                if chunk:
                    full_response += chunk
                    yield f"data: {chunk}\n\n"
            
            final_history = full_history + [{"role": "assistant", "content": full_response}]
            background_tasks.add_task(save_chat_to_state, user_id, request.session_id, active_resume_text, request.target_company, final_history)
            
        except Exception as e:
            logging.error(f"Error during streaming: {e}")
            yield f"data: [Error: {str(e)}]\n\n"
            
    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.post("/api/send_email")
async def send_email(request: SendEmailRequest, user_id: str = Depends(get_current_user)):
    try:
        creds = Credentials(token=request.access_token)
        service = build('gmail', 'v1', credentials=creds)
        
        message = EmailMessage()
        message.set_content(request.body)
        message['To'] = request.recipient_email
        message['Subject'] = request.subject
        
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {'raw': encoded_message}
        
        send_message = (service.users().messages().send(userId="me", body=create_message).execute())
        return {"status": "success", "message_id": send_message["id"]}
    except Exception as e:
        logging.error(f"Error sending email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluate/code")
async def evaluate_code(request: CodeEvaluationRequest, user_id: str = Depends(get_current_user)):
    system_prompt = f"""You are an elite competitive programming judge and Staff Engineer. 
The user was tasked with solving the following problem:
{request.problem_statement}

Here is their submitted code:
{request.user_code}

YOUR DIRECTIVES:
Do not run the code. Statically analyze it. Provide a brutal, Staff-Engineer level critique.
1. Determine the exact Time and Space Complexity of their implementation.
2. Point out any logical bugs, missed edge cases, memory leaks, or inefficiencies.
3. Determine if the code correctly solves the problem (Pass/Fail).
4. Keep the tone professional but highly critical and objective. Do not hallucinate external context.

STRICT FIREWALL RULES:
Output MUST be a raw, valid JSON object following the schema below. Do not wrap the JSON in markdown formatting blocks (e.g., absolutely no ```json).

JSON SCHEMA:
{{
  "pass_status": true,
  "time_complexity": "String (e.g., 'O(N)')",
  "space_complexity": "String (e.g., 'O(1)')",
  "bugs_and_edge_cases": ["String - Specific bugs or missed edge cases"],
  "staff_engineer_critique": "String - 2 to 3 sentences of brutal, constructive feedback on their approach"
}}"""

    try:
        response = invoke_with_retry_sync([HumanMessage(content=system_prompt)])
        raw_json = response.content.strip()
        
        if raw_json.startswith("```json"):
            raw_json = raw_json[7:-3]
        elif raw_json.startswith("```"):
            raw_json = raw_json[3:-3]
            
        evaluation_data = json.loads(raw_json.strip())
        
        return {
            "status": "success",
            "evaluation": evaluation_data
        }
    except Exception as e:
        logging.error(f"Error evaluating code: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse code evaluation.")

@app.post("/api/evaluate/interview")
async def evaluate_interview(request: InterviewEvaluationRequest, user_id: str = Depends(get_current_user)):
    if not request.chat_history:
        raise HTTPException(status_code=400, detail="Chat history is empty.")

    formatted_history = "\n".join([f"{msg.get('role', 'unknown').capitalize()}: {msg.get('content', '')}" for msg in request.chat_history])
    
    system_prompt = f"""You are an elite Tech Career Coach evaluating a candidate's mock interview performance.
Analyze the following interview transcript and provide a brutal, objective assessment.

TRANSCRIPT:
{formatted_history}

YOUR DIRECTIVES:
1. Provide an overall score (0-100).
2. List 1 to 3 specific strengths demonstrated by the candidate.
3. List 1 to 3 specific weaknesses or areas for improvement.
4. Identify a single, highly specific technical topic they should study next based on their weaknesses (e.g., "System Design Scalability", "React Server Components", "Dynamic Programming"). If they performed perfectly, suggest an advanced topic.

STRICT FIREWALL RULES:
Output MUST be a raw, valid JSON object following the schema below. Do not wrap the JSON in markdown formatting blocks (e.g., absolutely no ```json).

JSON SCHEMA:
{{
  "score": 85,
  "strengths": ["String", "String"],
  "weaknesses": ["String", "String"],
  "recommended_study_topic": "String"
}}"""

    try:
        response = invoke_with_retry_sync([HumanMessage(content=system_prompt)])
        raw_json = response.content.strip()
        
        if raw_json.startswith("```json"):
            raw_json = raw_json[7:-3]
        elif raw_json.startswith("```"):
            raw_json = raw_json[3:-3]
            
        evaluation_data = json.loads(raw_json.strip())
        
        eval_id = str(uuid.uuid4())
        strengths_json = json.dumps(evaluation_data.get("strengths", []))
        weaknesses_json = json.dumps(evaluation_data.get("weaknesses", []))
        company_label = request.target_company if request.target_company and request.target_company != "none" else "Generic"
        company_label = company_label.strip().title()

        db_save_evaluation(
            user_id,
            eval_id, 
            company_label, 
            evaluation_data.get("score", 0), 
            strengths_json, 
            weaknesses_json, 
            evaluation_data.get("recommended_study_topic", "General Technical Review")
        )

        return {
            "status": "success",
            "evaluation": evaluation_data
        }
    except Exception as e:
        logging.error(f"Error evaluating interview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/evaluations")
async def get_evaluations(user_id: str = Depends(get_current_user)):
    try:
        raw_evals = db_get_all_evaluations(user_id)
        formatted_evals = []
        for e in raw_evals:
            formatted_evals.append({
                "id": e["id"],
                "timestamp": e["timestamp"],
                "company": e["company"],
                "score": e["score"],
                "strengths": json.loads(e["strengths"]) if e["strengths"] else [],
                "weaknesses": json.loads(e["weaknesses"]) if e["weaknesses"] else [],
                "recommended_study_topic": e["recommended_study_topic"]
            })
        return formatted_evals
    except Exception as e:
        logging.error(f"Error fetching evaluations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/evaluations/{eval_id}")
async def delete_evaluation(eval_id: str, user_id: str = Depends(get_current_user)):
    try:
        db_delete_evaluation(user_id, eval_id)
        return {"status": "success", "message": "Evaluation deleted successfully."}
    except Exception as e:
        logging.error(f"Error deleting evaluation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
