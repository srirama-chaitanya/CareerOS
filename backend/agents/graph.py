from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from db.chroma_db import retrieve_context

class AgentState(TypedDict):
    status: str

import os
from dotenv import load_dotenv

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

# Build graph
workflow = StateGraph(AgentState)
workflow.add_node("analyze_profile", analyze_profile)
workflow.add_edge(START, "analyze_profile")
workflow.add_edge("analyze_profile", END)

def get_graph(checkpointer):
    return workflow.compile(checkpointer=checkpointer)
