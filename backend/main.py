from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging

from db.database import get_checkpointer
from agents.graph import get_graph

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
    leetcode_rating: Optional[str] = None
    core_skills: Optional[List[str]] = None
    projects: Optional[List[str]] = None

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
            "leetcode_rating": "",
            "core_skills": [],
            "projects": [],
            "strategist_comment": ""
        }

@app.post("/api/state")
async def update_state(request: StateUpdateRequest, thread_id: str = "default_user"):
    config = {"configurable": {"thread_id": thread_id}}
    
    update_data = {}
    if request.leetcode_rating is not None:
        update_data["leetcode_rating"] = request.leetcode_rating
    if request.core_skills is not None:
        update_data["core_skills"] = request.core_skills
    if request.projects is not None:
        update_data["projects"] = request.projects
        
    logging.info(f"Updating state for {thread_id} with data: {update_data}")

    # Invoke graph to update state and generate strategist comment
    # Since we are using an LLM, this might take a few seconds
    result = agent_graph.invoke(update_data, config=config)
    
    return result
