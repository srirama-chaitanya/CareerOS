from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3
import os
from typing import List, Dict, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "checkpoints.db")

def init_resumes_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_resumes (
        id TEXT PRIMARY KEY,
        label TEXT UNIQUE,
        filename TEXT,
        is_active INTEGER DEFAULT 0,
        raw_text TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interview_evaluations (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        company TEXT,
        score INTEGER,
        strengths TEXT,
        weaknesses TEXT,
        recommended_study_topic TEXT
    )
    """)
    
    # Try adding the column if it doesn't exist (for existing databases)
    try:
        cursor.execute("ALTER TABLE user_resumes ADD COLUMN raw_text TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists

    conn.commit()
    conn.close()

# Initialize resumes DB table on load
init_resumes_db()

def get_checkpointer():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    saver = SqliteSaver(conn)
    saver.setup() # Ensure tables are created
    return saver

def db_save_resume(resume_id: str, label: str, filename: str, raw_text: str = ""):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Check if there are any existing resumes
        cursor.execute("SELECT COUNT(*) FROM user_resumes")
        count = cursor.fetchone()[0]
        is_active = 1 if count == 0 else 0
        
        cursor.execute(
            "INSERT OR REPLACE INTO user_resumes (id, label, filename, is_active, raw_text) VALUES (?, ?, ?, ?, ?)",
            (resume_id, label, filename, is_active, raw_text)
        )
        conn.commit()
    finally:
        conn.close()

def db_get_all_resumes() -> List[Dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, label, filename, is_active FROM user_resumes")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def db_get_active_resume_id() -> Optional[str]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM user_resumes WHERE is_active = 1 LIMIT 1")
        row = cursor.fetchone()
        return row[0] if row else None
    finally:
        conn.close()

def db_set_active_resume(resume_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Step 1: Turn OFF all resumes
        cursor.execute("UPDATE user_resumes SET is_active = 0")
        # Step 2: Turn ON only the selected resume
        cursor.execute("UPDATE user_resumes SET is_active = 1 WHERE id = ?", (resume_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def db_delete_resume(resume_id: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Check if the resume being deleted is currently active
        cursor.execute("SELECT is_active FROM user_resumes WHERE id = ?", (resume_id,))
        row = cursor.fetchone()
        was_active = row[0] if row else 0
        
        cursor.execute("DELETE FROM user_resumes WHERE id = ?", (resume_id,))
        
        # If it was active, set another one as active
        if was_active:
            cursor.execute("SELECT id FROM user_resumes ORDER BY id LIMIT 1")
            next_row = cursor.fetchone()
            if next_row:
                cursor.execute("UPDATE user_resumes SET is_active = 1 WHERE id = ?", (next_row[0],))
        
        conn.commit()
        return was_active
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def db_get_resume_text(resume_id: str) -> str:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT raw_text FROM user_resumes WHERE id = ?", (resume_id,))
        row = cursor.fetchone()
        if row and row[0]:
            return row[0]
        return ""
    finally:
        conn.close()

def db_save_evaluation(eval_id: str, company: str, score: int, strengths: str, weaknesses: str, topic: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO interview_evaluations (id, company, score, strengths, weaknesses, recommended_study_topic) VALUES (?, ?, ?, ?, ?, ?)",
            (eval_id, company, score, strengths, weaknesses, topic)
        )
        conn.commit()
    finally:
        conn.close()

def db_get_all_evaluations() -> List[Dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, timestamp, company, score, strengths, weaknesses, recommended_study_topic FROM interview_evaluations ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def db_delete_evaluation(eval_id: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM interview_evaluations WHERE id = ?", (eval_id,))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


