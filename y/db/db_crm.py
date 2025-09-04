import sqlite3
from pathlib import Path

DB_FILE = Path(__file__).resolve().parent.parent.parent / "crm.db"

def init_accounts_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()


    # Accounts table
    c.execute("""
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        password TEXT,
        chrome_profile_path TEXT DEFAULT NULL,
        proxy TEXT,
        status TEXT DEFAULT 'idle',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_run TEXT,
        cookies TEXT DEFAULT NULL
    )
    """)

    # Logs table
    c.execute("""
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER,
        timestamp TEXT,
        videos_scraped INTEGER,
        status TEXT,
        error TEXT,
        FOREIGN KEY(account_id) REFERENCES accounts(id)
    )
    """)

    conn.commit()
    conn.close()

def get_accounts_db():
    return sqlite3.connect(DB_FILE)
