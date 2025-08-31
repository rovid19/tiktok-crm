import sqlite3
from pathlib import Path

DB_FILE = Path(__file__).resolve().parent.parent.parent / "videos.db"

def init_videos_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    # Scraped videos table
    c.execute("""
    CREATE TABLE IF NOT EXISTS scraped_videos (
        id TEXT PRIMARY KEY,
        account_id INTEGER,
        hashtag TEXT,
        desc TEXT,
        url TEXT,
        views INTEGER,
        likes INTEGER,
        comments INTEGER,
        shares INTEGER,
        created_at TEXT,
        scraped_at TEXT
    )
    """)

    conn.commit()
    conn.close()

def get_videos_db():
    return sqlite3.connect(DB_FILE)

def save_scraped_video(video):
    conn = get_videos_db()
    c = conn.cursor()
    c.execute("""
        INSERT OR IGNORE INTO scraped_videos 
        (id, account_id, hashtag, desc, url, views, likes, comments, shares, created_at, scraped_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        video["id"], video["account_id"], video["hashtag"], video["desc"], video["url"],
        video["views"], video["likes"], video["comments"], video["shares"],
        video["created_at"], video["scraped_at"]
    ))
    conn.commit()
    conn.close()
