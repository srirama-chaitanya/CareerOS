from typing import TypedDict, Optional, List, Dict
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from db.chroma_db import retrieve_context
from tools.jsearch import search_jobs
import json
import os
from dotenv import load_dotenv

class AgentState(TypedDict):
    status: str
    action: Optional[str]
    hunt_mode: Optional[str]
    hunt_query: Optional[str]
    hunt_location: Optional[str]
    hunt_job_type: Optional[str]
    hunt_experience: Optional[str]
    hunt_extra_info: Optional[str]
    job_results: Optional[List[Dict]]

# Load environment variables from .env
load_dotenv()

# We will use gemini-2.5-flash as the API key is now valid and this model is supported.
api_key = os.environ.get("GOOGLE_API_KEY") or "missing_api_key"
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0, google_api_key=api_key)

SYSTEM_PROMPT = """You are an Elite Technical Career Strategist.
Currently standing by for instructions."""

def analyze_profile(state: AgentState):
    # Dummy node for now, just sets status
    return {
        "status": "ready"
    }

def hunt_jobs(state: AgentState):
    mode = state.get("hunt_mode", "auto")
    manual_query = state.get("hunt_query", "")
    location = state.get("hunt_location", "remote")
    job_type = state.get("hunt_job_type", "full-time")
    experience = state.get("hunt_experience", "")
    extra_info = state.get("hunt_extra_info", "")
    
    resume_context = retrieve_context("engineering experience, backend development, full-stack projects, competitive programming, skills")
    
    extra_instruction = f"\nCandidate also provided this extra requirement: '{extra_info}'. Factor this into the query and match score." if extra_info else ""
    
    if mode == "auto":
        query_prompt = f"""You are an elite tech recruiter. 
Read this candidate's resume context and extract their ideal Target Role and Experience Level based on their skills and history.
Output ONLY the job title search string (e.g. "Senior Python Backend Engineer" or "Frontend Intern"). Do not include location.
{extra_instruction}

RESUME CONTEXT:
{resume_context}"""
        query_response = llm.invoke([HumanMessage(content=query_prompt)])
        search_term = query_response.content.strip()
        search_term = f"{search_term} {job_type}"
    else:
        search_term = f"{experience} {manual_query} {job_type}".strip()
        
    raw_jobs = search_jobs(search_term, location)
    
    if not raw_jobs:
        return {"status": "completed", "job_results": []}
        
    match_prompt = f"""You are an elite career strategist.
I will give you a candidate's RESUME CONTEXT and a list of JOB DESCRIPTIONS.
For each job, compare the requirements to the candidate's skills.
Calculate a Match Score (0-100) and provide a 1-sentence reasoning explaining why it's a good or bad fit.
DO NOT MENTION CGPA OR GRADES. Focus on tech stack fit.
{extra_instruction}

RESUME CONTEXT:
{resume_context}

JOBS TO EVALUATE:
"""
    for i, job in enumerate(raw_jobs):
        match_prompt += f"\n[Job {i}]\nTitle: {job['job_title']}\nCompany: {job['employer_name']}\nDescription: {job['job_description'][:500]}...\n"
        
    match_prompt += """
Output your response as a valid JSON array of objects. Each object must have:
"job_index": integer (matching the [Job i] above),
"match_score": integer (0 to 100),
"reason": string (1 sentence)

Respond ONLY with valid JSON. Do not use markdown blocks."""

    try:
        match_response = llm.invoke([HumanMessage(content=match_prompt)])
        raw_json = match_response.content.strip()
        if raw_json.startswith("```json"):
            raw_json = raw_json[7:-3]
        elif raw_json.startswith("```"):
            raw_json = raw_json[3:-3]
            
        match_data = json.loads(raw_json.strip())
        
        for match in match_data:
            idx = match.get("job_index")
            if idx is not None and 0 <= idx < len(raw_jobs):
                raw_jobs[idx]["match_score"] = match.get("match_score", 0)
                raw_jobs[idx]["match_reason"] = match.get("reason", "No reason provided.")
                
        raw_jobs.sort(key=lambda x: x.get("match_score", 0), reverse=True)
                
    except Exception as e:
        print(f"Error in match engine: {e}")
        for job in raw_jobs:
            job["match_score"] = 50
            job["match_reason"] = "Could not analyze fit due to processing error."
            
    return {
        "status": "completed",
        "job_results": raw_jobs
    }

def router(state: AgentState):
    if state.get("action") == "hunt":
        return "hunt_jobs"
    return "analyze_profile"

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("analyze_profile", analyze_profile)
workflow.add_node("hunt_jobs", hunt_jobs)

workflow.set_conditional_entry_point(
    router,
    {
        "hunt_jobs": "hunt_jobs",
        "analyze_profile": "analyze_profile"
    }
)

workflow.add_edge("analyze_profile", END)
workflow.add_edge("hunt_jobs", END)

def get_graph(checkpointer):
    return workflow.compile(checkpointer=checkpointer)
