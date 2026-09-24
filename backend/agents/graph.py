from typing import TypedDict, Optional, List, Dict
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from tools.jsearch import search_jobs
from tools.llm_pool import get_llm, get_creative_llm, invoke_with_retry, invoke_with_retry_sync, astream_with_retry
from db.database import db_get_active_resume_id, db_get_all_resumes, db_get_resume_text
import json
import os
from dotenv import load_dotenv

class AgentState(TypedDict):
    user_id: Optional[str]
    status: str
    action: Optional[str]
    search_string: Optional[str]
    active_resume_id: Optional[str]
    active_resume_text: Optional[str]
    location: Optional[str]
    job_type: Optional[str]
    experience_level: Optional[str]
    extra_info: Optional[str]
    job_results: Optional[List[Dict]]
    outreach_target_jd: Optional[str]
    outreach_subject: Optional[str]
    outreach_draft: Optional[str]
    draft_modifier: Optional[str]
    target_company: Optional[str]
    chat_history: Optional[list]
    evaluation_result: Optional[dict]
    user_preferences: Optional[dict]
    study_plan: Optional[dict]
    study_topic: Optional[str]
    study_duration: Optional[int]
    study_goal: Optional[str]

# Load environment variables from .env
load_dotenv()

# LLM is sourced from the rotation pool — do not instantiate directly here.
# Use get_llm() / get_creative_llm() per-call to rotate keys automatically.

SYSTEM_PROMPT = """You are an Elite Technical Career Strategist.
Currently standing by for instructions."""

def analyze_profile(state: AgentState):
    # Dummy node for now, just sets status
    return {
        "status": "ready"
    }

async def hunt_jobs(state: AgentState):
    search_string = state.get("search_string", "")
    active_resume_text = state.get("active_resume_text", "")
    location = state.get("location", "remote")
    job_type = state.get("job_type", "")
    experience_level = state.get("experience_level", "")
    extra_info = state.get("extra_info", "")

    # Pass the raw resume label as the core query — jsearch.py composes the full query
    raw_jobs = await search_jobs(search_string, location, job_type=job_type, experience_level=experience_level, extra_info=extra_info)



    
    if not raw_jobs:
        return {"status": "completed", "job_results": []}
        
    match_prompt = f"""You are an elite tech career strategist.
I will give you a candidate's RESUME CONTEXT and a list of JOB DESCRIPTIONS.
Calculate a Match Score (0-100) and provide a 1-sentence reasoning explaining why it's a good or bad fit.

STRICT FIREWALL RULES:
1. Base the score STRICTLY on the provided RESUME CONTEXT. Do not hallucinate skills, and do not assume any background knowledge that is not explicitly written in the resume text.
2. Output MUST be a raw, valid JSON array of objects. Do not use markdown blocks (e.g., ```json).

EXPECTED JSON SCHEMA:
[
  {{"job_index": 0, "match_score": 85, "reason": "String - 1 concise sentence."}}
]

RESUME CONTEXT:
{active_resume_text}

JOBS TO EVALUATE:
"""
    for i, job in enumerate(raw_jobs):
        match_prompt += f"\n[Job {i}]\nTitle: {job['job_title']}\nCompany: {job['employer_name']}\nDescription: {job['job_description'][:500]}...\n"

    try:
        match_response = await invoke_with_retry(get_llm(), [HumanMessage(content=match_prompt)])
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
    user_id = state.get("user_id")
    target_jd = state.get("outreach_target_jd", "")
    modifier = state.get("draft_modifier", "")
    
    active_id = db_get_active_resume_id(user_id) if user_id else None
    resume_context = db_get_resume_text(user_id, active_id) if active_id else "No active resume profile context found."
    
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

    draft_response = None
    try:
        draft_response = invoke_with_retry_sync([HumanMessage(content=system_prompt)])
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
        body = draft_response.content.strip() if draft_response else "Failed to generate email draft."
    
    return {
        "status": "drafted",
        "outreach_subject": subject,
        "outreach_draft": body
    }

def interviewer_node(state: AgentState):
    target_company = state.get("target_company", "none").lower()
    chat_history = state.get("chat_history", [])
    
    # Data Fetch: Read from State instead of querying SQLite
    resume_context = state.get("active_resume_text", "No active resume context available.")
    
    playbook_persona = ""
    playbook_topics = []
    
    if target_company != "none":
        # Load playbook from JSON
        playbook_path = os.path.join(os.path.dirname(__file__), "..", "company_playbooks.json")
        try:
            with open(playbook_path, "r") as f:
                playbooks = json.load(f)
                
            if target_company in playbooks:
                playbook_persona = playbooks[target_company].get("interview_style", "")
                playbook_topics = playbooks[target_company].get("favorite_topics", [])
        except Exception as e:
            print(f"Error loading company playbook: {e}")
            
    # Dual-Mode Routing
    if target_company == "none":
        topics_context = "General technical interview focusing on system design, databases, scaling, and competitive programming."
        target_company_display = "None"
    else:
        topics_context = f"Favorite Topics: {', '.join(playbook_topics)}. style: {playbook_persona}"
        target_company_display = target_company.capitalize()

    system_prompt = f"""You are Alex, a Senior Engineering Manager. You are conducting a technical interview for a software engineering role.

CANDIDATE CONTEXT:
{resume_context}

INTERVIEW PLAYBOOK & TOPICS:
{topics_context}
TARGET COMPANY: {target_company_display}

YOUR DIRECTIVES:
1. Persona & Tone: You are a sharp, experienced, and articulate human engineer. Speak naturally and directly. Absolutely DO NOT sound like an AI assistant. Do not use generic filler like "That's a great answer" or "Let's dive into the next topic." 
2. The One-Question Rule: You MUST NEVER ask more than one question at a time. Keep your responses concise (2-4 sentences maximum).
3. Adaptive Context: Base your questions strictly on the candidate's provided context. Do not invent details about their background.

THE INTERVIEW FLOW (Analyze the chat history to determine your next move):
- Phase 1: The Intro (If chat history is empty). 
  Greet the candidate warmly but professionally. 
  If TARGET COMPANY has a value, say exactly: "Hi, I'm Alex, an Engineering Manager here at {target_company_display}."
  If TARGET COMPANY is empty, null, or 'None', say exactly: "Hi, I'm Alex, an Engineering Manager here at CareerOS."
  Then add: "Thanks for making the time to chat today. How's your day going so far?" STOP THERE. Do not ask a technical question yet. Let them answer the icebreaker.
- Phase 2: The Drill-Down (If the candidate just answered a technical question).
  Do not just accept their answer and move on. Push back. Ask about edge cases, scalability, trade-offs, or potential points of failure in the exact architecture or logic they just described. 
- Phase 3: The Pivot (If a topic is exhausted after 1-2 follow-ups).
  Transition naturally to a brand new topic from the INTERVIEW PLAYBOOK & TOPICS. (e.g., "Makes sense. Let's shift gears for a minute and talk about your backend architecture...")

Respond ONLY with your next conversational turn. Do not output internal thoughts or meta-text."""

    messages = [SystemMessage(content=system_prompt)]
    
    for msg in chat_history:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg.get("content", "")))
        elif msg.get("role") == "assistant":
            messages.append(AIMessage(content=msg.get("content", "")))
            
    try:
        response = invoke_with_retry_sync(messages)
        new_history = chat_history + [{"role": "assistant", "content": response.content.strip()}]
        return {
            "status": "interview_ready",
            "chat_history": new_history
        }
    except Exception as e:
        print(f"Error in interviewer node: {e}")
        return {"status": "error"}

def evaluate_interview(state: AgentState):
    active_resume_text = state.get("active_resume_text", "")
    target_company = state.get("target_company", "none").lower()
    chat_history = state.get("chat_history", [])
    
    playbook_topics = []
    if target_company != "none":
        playbook_path = os.path.join(os.path.dirname(__file__), "..", "company_playbooks.json")
        try:
            with open(playbook_path, "r") as f:
                playbooks = json.load(f)
            if target_company in playbooks:
                playbook_topics = playbooks[target_company].get("favorite_topics", [])
        except Exception as e:
            print(f"Error loading company playbook: {e}")
            
    if target_company == "none":
        topics_context = "General technical interview focusing on system design, databases, scaling, and competitive programming."
    else:
        topics_context = f"Favorite Topics: {', '.join(playbook_topics)}."

    # Format chat history transcript
    transcript_lines = []
    for msg in chat_history:
        role = "Interviewer" if msg.get("role") == "assistant" else "Candidate"
        content = msg.get("content", "")
        transcript_lines.append(f"{role}: {content}")
    transcript_str = "\n".join(transcript_lines)

    system_prompt = f"""You are an elite Principal Engineer acting as an interview grader.
The candidate has just completed a mock technical interview. I will provide their resume context, the company's evaluation playbook, and the complete transcript of their interview.

YOUR DIRECTIVES:
Evaluate the candidate's performance brutally but fairly.
Identify exactly where they hesitated, what architectural blind spots they had, and what edge cases they failed to mention based on the transcript.

STRICT FIREWALL RULES:
1. Base the evaluation STRICTLY on the provided chat transcript and resume context. Do not hallucinate skills or assume background knowledge.
2. Output MUST be a raw, valid JSON object following the schema below. Do not wrap the JSON in markdown formatting blocks (e.g., absolutely no ```json).

JSON SCHEMA:
{{
  "final_score_out_of_100": 0,
  "summary_feedback": "String - 2 to 3 sentences of high-level feedback",
  "technical_strengths": ["String - Bullet points of what they got right"],
  "critical_weaknesses": ["String - Specific technical failures (e.g., 'Failed to account for cache invalidation')"],
  "missed_edge_cases": ["String - Specific edge cases they ignored"]
}}

CANDIDATE CONTEXT: 
{active_resume_text}

INTERVIEW PLAYBOOK: 
{topics_context}

INTERVIEW TRANSCRIPT: 
{transcript_str}"""

    try:
        response = invoke_with_retry_sync([HumanMessage(content=system_prompt)])
        raw_json = response.content.strip()
        
        if raw_json.startswith("```json"):
            raw_json = raw_json[7:-3]
        elif raw_json.startswith("```"):
            raw_json = raw_json[3:-3]
            
        evaluation_data = json.loads(raw_json.strip())
        
        return {
            "status": "evaluated",
            "evaluation_result": evaluation_data
        }
    except Exception as e:
        print(f"Error in evaluate_interview node: {e}")
        return {
            "status": "error",
            "evaluation_result": {
                "final_score_out_of_100": 0,
                "summary_feedback": "Failed to parse grading evaluation.",
                "technical_strengths": [],
                "critical_weaknesses": [],
                "missed_edge_cases": []
            }
        }

def generate_study_plan(state: AgentState):
    evaluation_result = state.get("evaluation_result", {})
    user_preferences = state.get("user_preferences", {})
    study_topic = state.get("study_topic")
    study_duration = state.get("duration_days", state.get("study_duration", 3))
    study_goal = state.get("study_goal", "revision")
    
    if study_topic:
        prompt_context = f"The user requested a custom study plan for the topic: '{study_topic}'. Their primary learning goal is: '{study_goal}'."
        target_days = study_duration
    else:
        interview_evaluation_report = json.dumps(evaluation_result, indent=2)
        user_preferences_str = json.dumps(user_preferences, indent=2)
        prompt_context = f"""I will provide their evaluation report and their custom scheduling preferences.
EVALUATION REPORT:
{interview_evaluation_report}
USER PREFERENCES:
{user_preferences_str}"""
        target_days = user_preferences.get("target_days", 3)

    system_prompt = f"""You are "The Strategist", an elite AI engineering coach.
{prompt_context}
Generate a highly targeted Revision Plan that addresses the requirements while strictly adhering to their time constraints.

STRICT FIREWALL RULES:
1. Dynamic Scaling: The number of days in the `daily_schedule` array MUST perfectly match the {target_days} days requested.
2. Action Over Theory: Core tasks must be execution-based (writing code, debugging). 
3. Resource Hallucination Ban: Do NOT generate raw URLs for external resources. You must generate highly specific search queries that the user can plug into YouTube or Google.
4. Output MUST be a raw, valid JSON object following the schema below. Do not wrap the JSON in markdown formatting blocks.

JSON SCHEMA:
{{
  "plan_title": "String - A punchy title",
  "duration_days": "Integer - Must match user preference",
  "daily_schedule": [
    {{
      "day_number": 1,
      "focus_area": "String",
      "action_items": ["String - Specific, actionable study task scoped to their time limit"],
      "recommended_resources": [
        {{
          "platform": "youtube | google",
          "search_query": "String - Highly specific search terms (e.g., 'Node.js SQLite WAL mode concurrency tutorial')"
        }}
      ],
      "evaluation_task": {{
        "problem_title": "String",
        "problem_statement": "String - A custom coding problem specifically evaluating this day's focus area"
      }}
    }}
  ]
}}"""

    try:
        response = invoke_with_retry_sync([HumanMessage(content=system_prompt)], max_retries=3)
        raw_json = response.content.strip()
        
        if raw_json.startswith("```json"):
            raw_json = raw_json[7:-3]
        elif raw_json.startswith("```"):
            raw_json = raw_json[3:-3]
            
        study_plan_data = json.loads(raw_json.strip())
        
        return {
            "status": "planned",
            "study_plan": study_plan_data
        }
    except Exception as e:
        print(f"Error in generate_study_plan node: {e}")
        return {
            "status": "error",
            "study_plan": {}
        }

def router(state: AgentState):
    action = state.get("action")
    if action == "hunt":
        return "hunt_jobs"
    elif action == "draft":
        return "draft_pitch"
    elif action == "interview":
        return "interviewer_node"
    elif action == "evaluate":
        return "evaluate_interview"
    elif action == "plan":
        return "generate_study_plan"
    return "analyze_profile"

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("analyze_profile", analyze_profile)
workflow.add_node("hunt_jobs", hunt_jobs)
workflow.add_node("draft_pitch", draft_pitch)
workflow.add_node("interviewer_node", interviewer_node)
workflow.add_node("evaluate_interview", evaluate_interview)
workflow.add_node("generate_study_plan", generate_study_plan)

workflow.set_conditional_entry_point(
    router,
    {
        "hunt_jobs": "hunt_jobs",
        "draft_pitch": "draft_pitch",
        "interviewer_node": "interviewer_node",
        "evaluate_interview": "evaluate_interview",
        "generate_study_plan": "generate_study_plan",
        "analyze_profile": "analyze_profile"
    }
)

workflow.add_edge("analyze_profile", END)
workflow.add_edge("hunt_jobs", END)
workflow.add_edge("draft_pitch", END)
workflow.add_edge("interviewer_node", END)
workflow.add_edge("evaluate_interview", END)
workflow.add_edge("generate_study_plan", END)

def get_graph(checkpointer):
    return workflow.compile(checkpointer=checkpointer)

async def stream_interview_response(active_resume_text: str, target_company: str, chat_history: list):
    playbook_persona = ""
    playbook_topics = []
    target_company_lower = target_company.lower()
    
    if target_company_lower != "none":
        # Load playbook from JSON
        playbook_path = os.path.join(os.path.dirname(__file__), "..", "company_playbooks.json")
        try:
            with open(playbook_path, "r") as f:
                playbooks = json.load(f)
                
            if target_company_lower in playbooks:
                playbook_persona = playbooks[target_company_lower].get("interview_style", "")
                playbook_topics = playbooks[target_company_lower].get("favorite_topics", [])
        except Exception as e:
            print(f"Error loading company playbook: {e}")
            
    # Dual-Mode Routing
    if target_company_lower == "none":
        topics_context = "General technical interview focusing on system design, databases, scaling, and competitive programming."
        target_company_display = "None"
    else:
        topics_context = f"Favorite Topics: {', '.join(playbook_topics)}. style: {playbook_persona}"
        target_company_display = target_company.capitalize()

    system_prompt = f"""You are Alex, a Senior Engineering Manager. You are conducting a technical interview for a software engineering role.

CANDIDATE CONTEXT: {active_resume_text}
INTERVIEW PLAYBOOK & TOPICS: {topics_context}
TARGET COMPANY: {target_company_display}

YOUR DIRECTIVES:
1. Persona: Speak naturally and directly. Absolutely DO NOT sound like an AI assistant.
2. The One-Question Rule: You MUST NEVER ask more than one question at a time. Keep responses concise (2-4 sentences max).
3. Context Accuracy: Base your questions strictly on the candidate's provided context and the company playbook. Do not invent details about their background.

THE INTERVIEW FLOW:
- If chat history is empty: If TARGET COMPANY has a value, say "Hi, I'm Alex, an Engineering Manager here at {target_company_display}." If empty, say "...here at CareerOS." Then add: "Thanks for making the time to chat today. How's your day going so far?" STOP THERE.
- If answering a technical question: Push back. Ask about edge cases, scalability, or trade-offs in the exact architecture or logic they just described.
- Pivot: If a topic is exhausted, pivot to a new topic from the playbook.

Respond ONLY with your next conversational turn. Do not output internal thoughts or meta-text."""

    messages = [SystemMessage(content=system_prompt)]
    
    for msg in chat_history:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg.get("content", "")))
        elif msg.get("role") == "assistant":
            messages.append(AIMessage(content=msg.get("content", "")))
            
    async for chunk in astream_with_retry(get_llm(), messages):
        yield chunk.content
