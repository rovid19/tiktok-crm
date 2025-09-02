from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import shutil
import datetime
import os
from fastapi import HTTPException
import sqlite3
from backend.db.db_crm import DB_FILE, init_accounts_db, get_accounts_db
from backend.db.db_videos import init_videos_db
from pydantic import BaseModel
from typing import Optional
import tempfile
import json
from Crypto.Cipher import AES  
import browser_cookie3

class Account(BaseModel):
    email: Optional[str] = ""
    password: Optional[str] = ""
    proxy: Optional[str] = ""



app = FastAPI()
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_PROFILE_DIR = os.path.join(PROJECT_ROOT, "profiles")

def get_db():
    return sqlite3.connect(DB_FILE)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],  # Your frontend URLs + allow all for testing
    allow_credentials=False,  # Changed to False since we're not using credentials
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Explicit methods
    allow_headers=["*"],  # Allow all headers
)

# Initialize DB at startup
init_accounts_db()
init_videos_db()

@app.get("/accounts")
def list_accounts():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, email, password, chrome_profile_path, proxy, status, created_at, last_run, cookies FROM accounts")
    rows = c.fetchall()
    conn.close()

    return [{"id": r[0], "email": r[1], "password": r[2], "chrome_profile_path": r[3], "proxy": r[4], "status": r[5], "created_at": r[6], "last_run": r[7], "cookies": r[8]} for r in rows]

@app.post("/accounts/add")
def add_account(account: Account):
    conn = get_db()
    c = conn.cursor()
    current_time = datetime.datetime.now().isoformat()

    # Create profile folder
    c.execute("SELECT MAX(id) FROM accounts")
    last_id = c.fetchone()[0] or 0
    new_id = last_id + 1
    profile_path = os.path.join(BASE_PROFILE_DIR, str(new_id))

    os.makedirs(profile_path, exist_ok=True)

    # Insert account into DB with assigned profile path
    c.execute("""
        INSERT INTO accounts (id, email, password, chrome_profile_path, proxy,  status, created_at)
        VALUES (?, ?, ?, ?, ?, 'idle', ?)
    """, (
        new_id,
        account.email,
        account.password,
        profile_path,
        account.proxy,
        current_time
    ))

    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "msg": f"Added account {account.email or '(empty email)'} with profile {profile_path}",
        "profile_path": profile_path
    }

@app.post("/accounts/{account_id}/launch_profile")
def launch_profile(account_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT chrome_profile_path, proxy FROM accounts WHERE id=?", (account_id,))
    row = c.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Account not found")

    profile_path, proxy = row

    # Build Chrome launch command
    cmd = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        f"--user-data-dir={profile_path}",
        "--profile-directory=Default",
        "--remote-debugging-port=9222",
        "https://www.tiktok.com"
    ]
    if proxy:
        cmd.insert(1, f"--proxy-server={proxy}")

    try:
        subprocess.Popen(cmd)  # async launch
        # Mark as validated in DB
        #c.execute("UPDATE accounts SET is_validated=1 WHERE id=?", (account_id,))
        #conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))

    conn.close()
    return {"status": "ok", "msg": f"Launched Chrome for account {account_id} and marked as validated"}



@app.delete("/accounts/delete/{account_id}")
def delete_account(account_id: int):
    conn = get_db()
    c = conn.cursor()
    
    # First check if account exists
    c.execute("SELECT email, chrome_profile_path FROM accounts WHERE id=?", (account_id,))
    row = c.fetchone()
    
    if not row:
        conn.close()
        return {"status": "error", "msg": "Account not found"}
    
    email, profile_path = row
    
    # Delete the account from DB
    c.execute("DELETE FROM accounts WHERE id=?", (account_id,))
    conn.commit()
    conn.close()
    
    # Delete profile folder if it exists
    if profile_path and os.path.exists(profile_path):
        try:
            shutil.rmtree(profile_path)  # deletes entire folder
            print(f"[INFO] Deleted profile folder: {profile_path}")
        except Exception as e:
            print(f"[WARN] Could not delete profile folder {profile_path}: {e}")
    
    return {"status": "ok", "msg": f"Deleted account {email} and profile folder"}


@app.post("/accounts/{account_id}/run_scraper")
def run_scraper(account_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT chrome_profile_path, proxy, email FROM accounts WHERE id=?", (account_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")

    profile_path, proxy, email = row

    cmd = [
        "python3", "-m", "backend.scrapers.VideoScraper",
        f"--account={account_id}",
        f"--hashtag=creepypasta",
        f"--pages=3",
    ]
    if proxy:
        cmd.append(f"--proxy={proxy}")

    process = subprocess.Popen(
        cmd,
        cwd=os.path.dirname(os.path.dirname(__file__)),
        stdout=subprocess.PIPE,   # scraper sends JSON result here
        stderr=subprocess.PIPE,   # scraper logs go here
        text=True,
        bufsize=1
    )

    logs = []
    # Stream logs live
    for line in process.stderr:
        line = line.strip()
        if line:
            print(f"[SCRAPER] {line}")   # appears live in FastAPI console
            logs.append(line)

    stdout_data = process.stdout.read().strip()
    process.wait()

    if process.returncode != 0:
        try:
            error_json = json.loads(stdout_data)
            raise HTTPException(status_code=400, detail=error_json)
        except Exception:
            msg = stdout_data or "Unknown scraper error"
            raise HTTPException(status_code=500, detail={"error": "scraper_failed", "message": msg})

    return {
        "status": "ok",
        "msg": f"Scraper finished for account {email}",
        "logs": logs,
        "output": stdout_data
    }


@app.put("/accounts/update/{account_id}")
def update_account(account_id: int, account: Account):
    conn = get_db()
    c = conn.cursor()

    # Build SET clause dynamically (skip empty strings)
    updates = []
    values = []
    for field, value in account.model_dump().items():
        if value != "":  # update only if not empty
            updates.append(f"{field}=?")
            values.append(value)

    if updates:
        query = f"UPDATE accounts SET {', '.join(updates)} WHERE id=?"
        values.append(account_id)
        c.execute(query, values)
        conn.commit()

    conn.close()
    return {"status": "ok", "msg": f"Updated account {account_id}"}





def extract_cookies_from_profile(profile_path: str):
    """Extract TikTok cookies from a given Chrome profile (macOS-safe)."""
    try:
        cj = browser_cookie3.chrome(cookie_file=os.path.join(profile_path, "Default", "Cookies"))
        cookies = {c.name: c.value for c in cj if "tiktok.com" in c.domain}
        return json.dumps(cookies)
    except Exception as e:
        raise RuntimeError(f"Failed to extract cookies: {e}")

@app.post("/accounts/{account_id}/fetch_cookies")
def fetch_cookies(account_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT chrome_profile_path FROM accounts WHERE id=?", (account_id,))
    row = c.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Account not found")

    profile_path = row[0]
    if not os.path.exists(profile_path):
        raise HTTPException(status_code=400, detail="Chrome profile path does not exist")

    try:
        cookies_json = extract_cookies_from_profile(profile_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract cookies: {e}")

    # Save cookies into DB
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE accounts SET cookies=? WHERE id=?", (cookies_json, account_id))
    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "msg": f"Fetched cookies for account {account_id}",
        "cookies": json.loads(cookies_json)
    }
