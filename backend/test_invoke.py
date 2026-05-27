from db.database import get_checkpointer
from agents.graph import get_graph

checkpointer = get_checkpointer()
app_graph = get_graph(checkpointer)

update_data = {
    "action": "hunt",
    "search_string": "Sde_Resume",
    "active_resume_id": "mock_id",
    "active_resume_text": "Experienced software engineer with python.",
    "location": "remote",
    "job_type": "full-time",
    "experience_level": "",
    "extra_info": ""
}
config = {"configurable": {"thread_id": "test_thread"}}
res = app_graph.invoke(update_data, config=config)
print("KEYS IN RES:")
print(list(res.keys()))
print("JOB RESULTS:")
print(res.get("job_results", []))
