from fastapi import FastAPI, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging
import os
import base64
import uuid
from email.message import EmailMessage
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from db.database import (
    get_checkpointer,
    db_save_resume,
    db_get_all_resumes,
    db_set_active_resume,
    db_delete_resume,
    db_get_active_resume_id
)
from agents.graph import get_graph, stream_interview_response
from db.chroma_db import process_and_store_pdf, is_resume_loaded


logging.basicConfig(level=logging.INFO)

app = FastAPI(title="CareerOS API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Checkpointer and Graph
checkpointer = get_checkpointer()
agent_graph = get_graph(checkpointer)

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

class SendEmailRequest(BaseModel):
    recipient_email: str
    subject: str
    body: str
    access_token: str

class ActiveResumeRequest(BaseModel):
    resume_id: str


@app.post("/api/chat")
async def chat(request: ChatRequest):
    return {"reply": "connection successful"}

@app.get("/api/state")
async def get_state(thread_id: str = "default_user"):
    config = {"configurable": {"thread_id": thread_id}}
    state_snapshot = agent_graph.get_state(config)
    
    if state_snapshot.values:
        return state_snapshot.values
    else:
        # Default empty state
        return {
            "status": "ready"
        }

@app.post("/api/state")
async def update_state(request: StateUpdateRequest, thread_id: str = "default_user"):
    config = {"configurable": {"thread_id": thread_id}}
    
    update_data = {}
    logging.info(f"Generating insight for {thread_id} via RAG")

    # Invoke graph to update state and generate strategist comment
    # Since we are using an LLM, this might take a few seconds
    result = agent_graph.invoke(update_data, config=config)
    
    return result

@app.post("/api/hunt")
async def trigger_hunt(request: HuntRequest, thread_id: str = "engineer_1"):
    config = {"configurable": {"thread_id": thread_id}}
    update_data = {
        "action": "hunt",
        "search_string": request.search_string,
        "active_resume_id": request.active_resume_id,
        "location": request.location,
        "job_type": request.job_type,
        "experience_level": request.experience_level,
        "extra_info": request.extra_info
    }
    
    logging.info(f"Triggering Smart Job Hunt for {thread_id} with query: {request.search_string}")
    result = agent_graph.invoke(update_data, config=config)
    
    return {"jobs": result.get("job_results", [])}

@app.post("/api/upload")
async def upload_resume(label: str = Form(...), file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    resume_id = str(uuid.uuid4())
    sanitized_label = label.strip().title()
    try:
        # Save to SQLite table
        db_save_resume(resume_id, sanitized_label, file.filename)
        
        # Save and vectorize vectors under resume_id
        contents = await file.read()
        process_and_store_pdf(contents, resume_id)
        
        return {
            "status": "success", 
            "message": "Resume uploaded and indexed successfully.",
            "resume_id": resume_id
        }
    except Exception as e:
        logging.error(f"Error processing resume: {str(e)}")
        # Clean up database entry if vectorizing failed
        try:
            db_delete_resume(resume_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")

@app.get("/api/status")
async def get_system_status():
    return {
        "resume_loaded": is_resume_loaded(),
        "active_resume_id": db_get_active_resume_id()
    }

@app.get("/api/resumes")
async def get_resumes():
    try:
        return db_get_all_resumes()
    except Exception as e:
        logging.error(f"Error fetching resumes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/resumes/active")
async def set_active_resume(request: ActiveResumeRequest):
    try:
        db_set_active_resume(request.resume_id)
        return {"status": "success", "message": "Active resume updated successfully."}
    except Exception as e:
        logging.error(f"Error setting active resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/resumes/{resume_id}")
async def delete_resume(resume_id: str):
    try:
        from db.chroma_db import delete_resume_vectors
        # Purge vector embeddings from ChromaDB first
        delete_resume_vectors(resume_id)
        
        # Clean from SQLite
        db_delete_resume(resume_id)
        return {"status": "success", "message": "Resume deleted successfully."}
    except Exception as e:
        logging.error(f"Error deleting resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/draft")
async def draft_email(request: DraftRequest):
    thread_id = "user_1"
    config = {"configurable": {"thread_id": thread_id}}
    update_data = {
        "action": "draft",
        "outreach_target_jd": request.job_description,
        "draft_modifier": request.modifier
    }
    
    try:
        app_graph = get_graph(checkpointer)
        app_graph.update_state(config, update_data)
        
        final_state = None
        for state in app_graph.stream(update_data, config=config):
            final_state = state
            
        if final_state and 'draft_pitch' in final_state:
            draft_node = final_state['draft_pitch']
            return {
                "subject": draft_node.get("outreach_subject", "Software Engineering Opportunity"),
                "body": draft_node.get("outreach_draft", "")
            }
            
        return {"subject": "", "body": "Error generating draft."}
    except Exception as e:
        logging.error(f"Error drafting: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def save_chat_to_state(session_id: str, active_resume_id: str, target_company: str, chat_history: list):
    try:
        config = {"configurable": {"thread_id": session_id}}
        update_data = {
            "action": "interview",
            "active_resume_id": active_resume_id,
            "target_company": target_company,
            "chat_history": chat_history
        }
        app_graph = get_graph(checkpointer)
        app_graph.update_state(config, update_data)
        logging.info(f"Asynchronously saved interview chat state to LangGraph for session {session_id}.")
    except Exception as e:
        logging.error(f"Error saving chat state: {e}")

@app.post("/api/interview/chat")
async def start_interview_chat(request: InterviewChatRequest, background_tasks: BackgroundTasks):
    # 1. The Fast Read (Async SQLite)
    config = {"configurable": {"thread_id": request.session_id}}
    app_graph = get_graph(checkpointer)
    state_snapshot = app_graph.get_state(config)
    
    current_history = []
    if state_snapshot.values and "chat_history" in state_snapshot.values:
        # LangGraph values might be None if uninitialized
        current_history = state_snapshot.values.get("chat_history") or []
        
    full_history = current_history + [{"role": "user", "content": request.new_message}]
    
    async def event_stream():
        full_response = ""
        try:
            generator = stream_interview_response(request.active_resume_id, request.target_company, full_history)
            async for chunk in generator:
                if chunk:
                    full_response += chunk
                    yield chunk
            
            final_history = full_history + [{"role": "assistant", "content": full_response}]
            background_tasks.add_task(save_chat_to_state, request.session_id, request.active_resume_id, request.target_company, final_history)
            
        except Exception as e:
            logging.error(f"Error during streaming: {e}")
            yield f"\n[Error: {str(e)}]"
            
    return StreamingResponse(event_stream(), media_type="text/plain")

@app.post("/api/send_email")
async def send_email(request: SendEmailRequest):
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

