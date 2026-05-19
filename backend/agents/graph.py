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
    outreach_target_jd: Optional[str]
    outreach_subject: Optional[str]
    outreach_draft: Optional[str]
    draft_modifier: Optional[str]

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

def draft_pitch(state: AgentState):
    target_jd = state.get("outreach_target_jd", "")
    modifier = state.get("draft_modifier", "")
    
    resume_context = retrieve_context("LeetCode, CodeChef, competitive programming, MERN, React, Node.js, SQLite, Java architecture")
    
    # Tone and style guidelines based on modifiers
    modifier_instruction = "Keep the email concise, punchy, and professional (around 150 words)."
    if modifier == "shorter":
        modifier_instruction = "Make the email extremely concise, under 100 words."
    elif modifier == "more_technical":
        modifier_instruction = "Make the email highly technical. Focus deeply on system design, clean SQLite database patterns, MERN architecture, and complex engineering metrics."
        
    system_prompt = f"""You are an elite Tech PR Agent writing a cold outreach email from the first-person perspective of the candidate.
You MUST write as if you are the developer himself (using 'I', 'my', 'me').

TARGET JOB DESCRIPTION:
{target_jd}

DEVELOPER'S RESUME CONTEXT:
{resume_context}

STRICT FIREWALL RULES - YOU MUST FOLLOW THESE OR FAIL:
1. YOU MUST write in the FIRST PERSON (e.g. "I am a backend engineer...", "My experience..."). Never write on behalf of someone else.
2. YOU MUST actively highlight the developer's competitive programming stats (LeetCode/CodeChef ratings).
3. YOU MUST highlight their MERN-lite (React, Node.js, SQLite) OR Java architecture experience. 
4. DO NOT just list project names (e.g. "I worked on Chess Academy"). Instead, briefly describe the impact and architectural highlights of your projects (e.g., "I built a scalable Chess Academy using RBAC logic" or "I designed a responsive engine for TaxSafar"). Give the recruiter concrete clarity on what you built.
5. YOU MUST completely IGNORE and OMIT any mention of CGPA, academic averages, or grades.
6. YOU MUST NOT mention C++ in any capacity. NEVER write "C++".
7. Avoid huge paragraphs. Keep it short, modern, and highly engaging.

{modifier_instruction}

Output your response ONLY as a valid JSON object with the following structure:
{{
  "subject": "A compelling, modern email subject line",
  "body": "The complete email body, styled with line breaks, written in the first person."
}}

Do not wrap the JSON in markdown blocks like ```json. Respond ONLY with raw JSON."""

    try:
        draft_response = llm.invoke([HumanMessage(content=system_prompt)])
        raw_json = draft_response.content.strip()
        
        # Strip markdown tags if LLM ignores instruction
        if raw_json.startswith("```json"):
            raw_json = raw_json[7:-3]
        elif raw_json.startswith("```"):
            raw_json = raw_json[3:-3]
            
        parsed_draft = json.loads(raw_json.strip())
        subject = parsed_draft.get("subject", "Software Engineering Opportunity")
        body = parsed_draft.get("body", "")
    except Exception as e:
        print(f"Error parsing draft JSON: {e}")
        subject = "Software Engineering Role"
        body = draft_response.content.strip()
    
    return {
        "status": "drafted",
        "outreach_subject": subject,
        "outreach_draft": body
    }

def router(state: AgentState):
    action = state.get("action")
    if action == "hunt":
        return "hunt_jobs"
    elif action == "draft":
        return "draft_pitch"
    return "analyze_profile"

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("analyze_profile", analyze_profile)
workflow.add_node("hunt_jobs", hunt_jobs)
workflow.add_node("draft_pitch", draft_pitch)

workflow.set_conditional_entry_point(
    router,
    {
        "hunt_jobs": "hunt_jobs",
        "draft_pitch": "draft_pitch",
        "analyze_profile": "analyze_profile"
    }
)

workflow.add_edge("analyze_profile", END)
workflow.add_edge("hunt_jobs", END)
workflow.add_edge("draft_pitch", END)

def get_graph(checkpointer):
    return workflow.compile(checkpointer=checkpointer)
