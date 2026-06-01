from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3
import os
from typing import List, Dict, Optional
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "checkpoints.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Resumes table (linked to users)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_resumes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        label TEXT,
        filename TEXT,
        is_active INTEGER DEFAULT 0,
        raw_text TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(user_id, label)
    )
    """)
    
    # Evaluations table (linked to users)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interview_evaluations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        company TEXT,
        score INTEGER,
        strengths TEXT,
        weaknesses TEXT,
        recommended_study_topic TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # Study Plans table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS study_plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT,
        goal TEXT,
        duration_days INTEGER,
        plan_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    conn.commit()
    conn.close()

# Initialize DB tables on load
init_db()

def get_checkpointer():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    saver = SqliteSaver(conn)
    saver.setup() # Ensure tables are created
    return saver

# --- User Auth Helpers ---
def db_create_user(user_id: str, email: str, password_hash: Optional[str] = None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
            (user_id, email, password_hash)
        )
        conn.commit()
    finally:
        conn.close()

def db_get_user_by_email(email: str) -> Optional[Dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, password_hash FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def db_get_user_by_id(user_id: str) -> Optional[Dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, password_hash FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

# --- Resume Helpers ---
def db_save_resume(user_id: str, resume_id: str, label: str, filename: str, raw_text: str = ""):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Check if user has any resumes
        cursor.execute("SELECT COUNT(*) FROM user_resumes WHERE user_id = ?", (user_id,))
        count = cursor.fetchone()[0]
        is_active = 1 if count == 0 else 0
        
        cursor.execute(
            "INSERT OR REPLACE INTO user_resumes (id, user_id, label, filename, is_active, raw_text) VALUES (?, ?, ?, ?, ?, ?)",
            (resume_id, user_id, label, filename, is_active, raw_text)
        )
        conn.commit()
    finally:
        conn.close()

def db_get_all_resumes(user_id: str) -> List[Dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, label, filename, is_active FROM user_resumes WHERE user_id = ?", (user_id,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def db_get_active_resume_id(user_id: str) -> Optional[str]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM user_resumes WHERE user_id = ? AND is_active = 1 LIMIT 1", (user_id,))
        row = cursor.fetchone()
        return row[0] if row else None
    finally:
        conn.close()

def db_set_active_resume(user_id: str, resume_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # Step 1: Turn OFF all resumes for this user
        cursor.execute("UPDATE user_resumes SET is_active = 0 WHERE user_id = ?", (user_id,))
        # Step 2: Turn ON only the selected resume (must belong to user)
        cursor.execute("UPDATE user_resumes SET is_active = 1 WHERE id = ? AND user_id = ?", (resume_id, user_id))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def db_delete_resume(user_id: str, resume_id: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT is_active FROM user_resumes WHERE id = ? AND user_id = ?", (resume_id, user_id))
        row = cursor.fetchone()
        if not row:
            return False # Resume not found or not owned by user
            
        was_active = row[0]
        cursor.execute("DELETE FROM user_resumes WHERE id = ? AND user_id = ?", (resume_id, user_id))
        
        # If active was deleted, make another one active
        if was_active:
            cursor.execute("SELECT id FROM user_resumes WHERE user_id = ? ORDER BY id LIMIT 1", (user_id,))
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

def db_get_resume_text(user_id: str, resume_id: str) -> str:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT raw_text FROM user_resumes WHERE id = ? AND user_id = ?", (resume_id, user_id))
        row = cursor.fetchone()
        return row[0] if row and row[0] else ""
    finally:
        conn.close()

# --- Evaluation Helpers ---
def db_save_evaluation(user_id: str, eval_id: str, company: str, score: int, strengths: str, weaknesses: str, topic: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO interview_evaluations (id, user_id, company, score, strengths, weaknesses, recommended_study_topic) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (eval_id, user_id, company, score, strengths, weaknesses, topic)
        )
        conn.commit()
    finally:
        conn.close()

def db_get_all_evaluations(user_id: str) -> List[Dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, timestamp, company, score, strengths, weaknesses, recommended_study_topic FROM interview_evaluations WHERE user_id = ? ORDER BY timestamp DESC", (user_id,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def db_delete_evaluation(user_id: str, eval_id: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM interview_evaluations WHERE id = ? AND user_id = ?", (eval_id, user_id))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# --- Study Plan Helpers ---
def db_save_study_plan(user_id: str, plan_id: str, topic: str, goal: str, duration_days: int, plan_data: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO study_plans (id, user_id, topic, goal, duration_days, plan_data)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (plan_id, user_id, topic, goal, duration_days, plan_data))
        conn.commit()
    finally:
        conn.close()

def db_get_all_study_plans(user_id: str) -> List[Dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC', (user_id,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def db_delete_study_plan(user_id: str, plan_id: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('DELETE FROM study_plans WHERE id = ? AND user_id = ?', (plan_id, user_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()
