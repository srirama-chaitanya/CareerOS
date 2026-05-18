from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging

from db.database import get_checkpointer
from agents.graph import get_graph
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
    mode: str
    query: Optional[str] = ""
    location: Optional[str] = ""
    job_type: Optional[str] = ""
    experience_level: Optional[str] = ""
    extra_info: Optional[str] = ""

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
        "hunt_mode": request.mode,
        "hunt_query": request.query,
        "hunt_location": request.location,
        "hunt_job_type": request.job_type,
        "hunt_experience": request.experience_level,
        "hunt_extra_info": request.extra_info
    }
    
    logging.info(f"Triggering Auto-Hunt mode: {request.mode} for {thread_id}")
    result = agent_graph.invoke(update_data, config=config)
    
    return {"jobs": result.get("job_results", [])}

@app.post("/api/upload")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        contents = await file.read()
        process_and_store_pdf(contents)
        return {"status": "success", "message": "Resume uploaded and indexed successfully."}
    except Exception as e:
        logging.error(f"Error processing resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")

@app.get("/api/status")
async def get_system_status():
    return {"resume_loaded": is_resume_loaded()}

