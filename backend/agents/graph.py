from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import os

class AgentState(TypedDict):
    leetcode_rating: str
    core_skills: List[str]
    projects: List[str]
    strategist_comment: str

import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# We will use gemini-2.5-flash as the API key is now valid and this model is supported.
api_key = os.environ.get("GOOGLE_API_KEY") or "missing_api_key"
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0, google_api_key=api_key)

SYSTEM_PROMPT = """You are an Elite Technical Career Strategist.
Your goal is to evaluate the engineer's technical profile.
Constraints:
- You must prioritize highlighting competitive programming stats (like LeetCode Knight 1900+) and heavy backend/full-stack experience (like Java, MERN stack).
- FORBIDDEN: You must NEVER mention CGPA, academic averages, or C++. Focus purely on engineering impact.

Provide a single, hard-hitting professional sentence summarizing the engineer's technical strength based on their stats."""

def analyze_profile(state: AgentState):
    skills = ", ".join(state.get("core_skills", []))
    rating = state.get("leetcode_rating", "N/A")
    projects = ", ".join(state.get("projects", []))
    
    prompt = f"Profile:\nLeetCode Rating: {rating}\nSkills: {skills}\nProjects: {projects}"
    
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt)
    ]
    
    try:
        response = llm.invoke(messages)
        comment = response.content.strip()
    except Exception as e:
        comment = f"Could not generate comment: {str(e)}"
        
    # We return the delta for the state
    return {
        "leetcode_rating": rating,
        "core_skills": state.get("core_skills", []),
        "projects": state.get("projects", []),
        "strategist_comment": comment
    }

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("analyze_profile", analyze_profile)
workflow.add_edge(START, "analyze_profile")
workflow.add_edge("analyze_profile", END)

def get_graph(checkpointer):
    return workflow.compile(checkpointer=checkpointer)
