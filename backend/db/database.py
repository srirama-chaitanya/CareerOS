from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "checkpoints.db")

def get_checkpointer():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    saver = SqliteSaver(conn)
    saver.setup() # Ensure tables are created
    return saver
