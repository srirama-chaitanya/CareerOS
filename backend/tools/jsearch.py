import os
import httpx
import logging
from dotenv import load_dotenv

load_dotenv(override=True)

async def search_jobs(query: str, location: str = "remote", num_pages: int = 2, job_type: str = "", experience_level: str = "", extra_info: str = ""):
    """
    Searches for jobs using JSearch API (fully async, non-blocking).
    Strategy:
      1. Try with date_posted=3days (freshest jobs)
      2. If 0 results, retry with date_posted=week (broader window)
      3. If still 0 or API error, return empty list with a clear message — never fake data.
    """
    api_key = os.environ.get("JSEARCH_API_KEY") or os.getenv("JSEARCH_API_KEY")

    if not api_key:
        logging.warning("JSEARCH_API_KEY not set. Returning empty job list.")
        return []

    # Map code values to natural language for JSearch
    job_type_map = {
        "FULLTIME": "full time",
        "PARTTIME": "part time",
        "INTERN": "internship",
        "CONTRACTOR": "contract"
    }
    job_type_label = job_type_map.get(job_type.upper(), "") if job_type else ""

    # Build a rich natural language query: "Senior Backend Engineer full time Fintech"
    query_parts = [p for p in [experience_level, query, job_type_label, extra_info] if p.strip()]
    full_query = " ".join(query_parts)


    url = "https://jsearch.p.rapidapi.com/search"
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "jsearch.p.rapidapi.com"
    }

    async def _fetch(date_posted: str):
        params = {
            "query": f"{full_query} in {location}",
            "page": "1",
            "num_pages": str(num_pages),
            "date_posted": date_posted,
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()

        jobs = []
        for job in data.get("data", []):
            jobs.append({
                "job_title": job.get("job_title"),
                "employer_name": job.get("employer_name"),
                "job_city": job.get("job_city"),
                "job_country": job.get("job_country"),
                "job_is_remote": job.get("job_is_remote"),
                "job_description": job.get("job_description"),
                "job_apply_link": job.get("job_apply_link"),
                "job_posted_at_datetime_utc": job.get("job_posted_at_datetime_utc")
            })
        return jobs


    try:
        # First attempt: last 3 days
        jobs = await _fetch("3days")
        if jobs:
            logging.info(f"JSearch: {len(jobs)} jobs found (3days) for '{full_query}'")
            return jobs

        # Second attempt: last week
        logging.info(f"JSearch: 0 results for 3days, retrying with 'week' for '{full_query}'")
        import asyncio
        await asyncio.sleep(1) # Prevent RapidAPI back-to-back request blocks
        jobs = await _fetch("week")
        if jobs:
            logging.info(f"JSearch: {len(jobs)} jobs found (week) for '{full_query}'")
            return jobs

        # Genuinely no results — don't fake it
        logging.info(f"JSearch: 0 results even for week. Returning empty list.")
        return []

    except Exception as e:
        logging.error(f"JSearch API error: {repr(e)}")
        return []

