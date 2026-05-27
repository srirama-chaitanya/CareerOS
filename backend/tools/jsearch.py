import os
import json
import requests
import logging
from dotenv import load_dotenv

def search_jobs(query: str, location: str = "remote", num_pages: int = 1):
    """
    Searches for jobs using JSearch API.
    Graceful Fallback: If JSEARCH_API_KEY is not set or the API fails, it returns a robust set of mock jobs.
    """
    # Force reload the .env file from disk to capture live updates
    load_dotenv(override=True)
    api_key = os.getenv("JSEARCH_API_KEY")
    
    # Graceful Fallback Mode if no API key is found
    if not api_key:
        logging.info("JSEARCH_API_KEY not found in .env. Using Graceful Fallback Mock Jobs.")
        return get_mock_jobs(query)
        
    url = "https://jsearch.p.rapidapi.com/search"
    querystring = {"query": f"{query} in {location}", "page": str(num_pages), "num_pages": "1"}
    
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "jsearch.p.rapidapi.com"
    }
    
    try:
        response = requests.get(url, headers=headers, params=querystring)
        response.raise_for_status()
        data = response.json()
        
        jobs = []
        for job in data.get('data', []):
            jobs.append({
                "job_title": job.get("job_title"),
                "employer_name": job.get("employer_name"),
                "job_city": job.get("job_city"),
                "job_country": job.get("job_country"),
                "job_is_remote": job.get("job_is_remote"),
                "job_description": job.get("job_description"),
                "job_apply_link": job.get("job_apply_link")
            })
        if not jobs:
            logging.info(f"JSearch API returned 0 jobs for query: {query}. Falling back to Mock Jobs.")
            return get_mock_jobs(query)
            
        return jobs
    except Exception as e:
        logging.error(f"JSearch API error: {str(e)}. Falling back to Mock Jobs.")
        return get_mock_jobs(query)

def get_mock_jobs(query: str):
    """Returns a realistic set of mock jobs for UI testing and AI matching."""
    search_term = query.split()[0] if query else "Software"
    return [
        {
            "job_title": f"Senior {search_term.capitalize()} Engineer",
            "employer_name": "TechFlow Innovations",
            "job_city": "San Francisco",
            "job_country": "US",
            "job_is_remote": True,
            "job_description": "We are looking for an experienced backend engineer to architect highly scalable microservices. You must have deep experience with Python, FastAPI, and robust database design. Familiarity with LangGraph or vector databases is a huge plus.",
            "job_apply_link": "https://example.com/apply/1"
        },
        {
            "job_title": f"Full Stack {search_term.capitalize()} Developer",
            "employer_name": "Nexus Dynamics",
            "job_city": "New York",
            "job_country": "US",
            "job_is_remote": False,
            "job_description": "Join our fast-paced product team. You will be building responsive UIs in React and writing resilient backend APIs in Node.js/Python. We value competitive programming experience and strong CS fundamentals.",
            "job_apply_link": "https://example.com/apply/2"
        },
        {
            "job_title": "AI Product Engineer",
            "employer_name": "Synthetica Labs",
            "job_city": "Austin",
            "job_country": "US",
            "job_is_remote": True,
            "job_description": "We are building the future of AI tooling. The ideal candidate has experience integrating LLMs, building RAG architectures (ChromaDB/Pinecone), and deploying scalable React applications. Strong Python skills required.",
            "job_apply_link": "https://example.com/apply/3"
        }
    ]
