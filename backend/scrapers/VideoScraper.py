import subprocess
import json
import datetime
import argparse
import re
import sqlite3
import random
import sys

# import your db helpers
from backend.db.db_videos import init_videos_db, save_scraped_video

from pathlib import Path

# Path to this file → go two levels up
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "accounts.db"
DB_PATH_VIDEOS = BASE_DIR / "videos.db"

print("Accounts DB:", DB_PATH.resolve())
print("Videos DB:", DB_PATH_VIDEOS.resolve())


# ---------- HELPERS ----------
def normalize_curl(raw: str) -> str:
    cleaned = raw.replace("\\\n", " ")
    cleaned = cleaned.replace("\\", " ")
    cleaned = cleaned.replace("\\'", "'").replace('\\"', '"')
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def mark_cookies_expired(account_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "UPDATE accounts SET status=?, last_run=?, is_validated=? WHERE id=?",
        ("cookies expired", datetime.datetime.now().isoformat(), False, account_id),
    )
    conn.commit()
    conn.close()
    print(f"[WARN] Marked account {account_id} as cookies_expired in DB", file=sys.stderr)


def curl_failed(account_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "UPDATE accounts SET status=?, last_run=? WHERE id=?",
        ("curl failed", datetime.datetime.now().isoformat(), account_id),
    )
    conn.commit()
    conn.close()
    print(f"[WARN] Marked account {account_id} as curl_failed in DB", file=sys.stderr)


# ---------- USER AGENTS ----------
USER_AGENTS = {
    "mac_chrome": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "iphone_safari": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
}


def choose_user_agent() -> str:
    return USER_AGENTS["mac_chrome"] if random.random() < 0.8 else USER_AGENTS["iphone_safari"]


def inject_user_agent(curl_cmd: str, ua: str) -> str:
    if "--user-agent" in curl_cmd:
        curl_cmd = re.sub(r"--user-agent\s+'[^']+'", f"--user-agent '{ua}'", curl_cmd)
    else:
        curl_cmd += f" --user-agent '{ua}'"
    return curl_cmd


# ---------- SCRAPER ----------
import time

def scrape_hashtag(hashtag, curl_cmd, account_id=None, max_pages=1):
    init_videos_db()
    all_videos = []
    two_months_ago = datetime.datetime.now() - datetime.timedelta(days=60)

    curl_cmd = normalize_curl(curl_cmd)
    ua = choose_user_agent()
    curl_cmd = inject_user_agent(curl_cmd, ua)
    print(f"[HUMANIZE] Using User-Agent: {ua}", file=sys.stderr)

    no_new_count = 0

    for page in range(max_pages):
        print(f"[INFO] Fetching page {page+1} for #{hashtag}", file=sys.stderr)
        result = subprocess.run(curl_cmd, shell=True, capture_output=True, text=True)

        if result.returncode != 0:
            error = {"error": "curl_failed", "message": result.stderr.strip() or "Unknown curl error"}
            print(json.dumps(error), flush=True)
            if account_id:
                curl_failed(account_id)
            sys.exit(2)

        try:
            data = json.loads(result.stdout)
        except Exception as e:
            error = {"error": "cookies_expired", "message": str(e) or "Invalid or expired cookies"}
            print(json.dumps(error), flush=True)
            if account_id:
                mark_cookies_expired(account_id)
            sys.exit(3)

        items = data.get("itemList", [])
        print(f"[INFO] Got {len(items)} videos", file=sys.stderr)

        fresh_this_page = 0
        for v in items:
            created_at = datetime.datetime.fromtimestamp(v.get("createTime", 0))
            video_id = v.get("id")
            author = v.get("author", {}).get("uniqueId", "unknown")
            video_url = f"https://www.tiktok.com/@{author}/video/{video_id}"

            video = {
                "id": video_id,
                "account_id": account_id,
                "hashtag": hashtag,
                "desc": v.get("desc"),
                "url": video_url,
                "views": v.get("stats", {}).get("playCount"),
                "likes": v.get("stats", {}).get("diggCount"),
                "comments": v.get("stats", {}).get("commentCount"),
                "shares": v.get("stats", {}).get("shareCount"),
                "created_at": created_at.isoformat(),
                "scraped_at": datetime.datetime.now().isoformat()
            }

            # --- AGE FILTER ---
            if created_at <= two_months_ago:
                print(f"[SKIP] Old video {video_id} ({created_at})", file=sys.stderr)
                continue

            # --- DUPLICATE FILTER ---
            conn = sqlite3.connect(DB_PATH_VIDEOS)
            c = conn.cursor()
            c.execute("SELECT 1 FROM scraped_videos WHERE id=?", (video_id,))
            exists = c.fetchone()
            conn.close()

            if exists:
                print(f"[SKIP] Duplicate video {video_id} already in DB", file=sys.stderr)
                continue

            # --- SAVE FRESH VIDEO ---
            save_scraped_video(video)
            all_videos.append(video)
            fresh_this_page += 1
            print(f"[SAVE] Fresh video {video_id} ({created_at}) {video_url}", file=sys.stderr)

        # --- HUMANIZE DELAYS ---
        if fresh_this_page == 0:
            no_new_count += 1
            if no_new_count >= 3:
                print("[HUMANIZE] No fresh videos for 3 pages in a row, stopping scroll.", file=sys.stderr)
                break
        else:
            no_new_count = 0

        # Delay before next scroll
        base_delay = random.uniform(3, 10)   # normal scroll delay
        if random.random() < 0.2:            # 20% chance of long pause
            extra_delay = random.uniform(15, 25)
            base_delay += extra_delay
            print(f"[DELAY] Taking a longer pause ({extra_delay:.1f}s extra). Total: {base_delay:.1f}s", file=sys.stderr)
        else:
            print(f"[DELAY] Pausing {base_delay:.1f}s before next scroll", file=sys.stderr)

        time.sleep(base_delay)

    return all_videos

# ---------- MAIN ----------
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--hashtag", required=True)
    parser.add_argument("--account", type=int, default=None)
    parser.add_argument("--curl_file", required=True)
    parser.add_argument("--pages", type=int, default=1)
    args = parser.parse_args()

    with open(args.curl_file, "r") as f:
        raw_curl = f.read()

    curl_cmd = normalize_curl(raw_curl)

    videos = scrape_hashtag(
        args.hashtag,
        curl_cmd=curl_cmd,
        account_id=args.account,
        max_pages=args.pages
    )

    print(json.dumps({"status": "ok", "videos": len(videos)}))  # ✅ success also goes to stdout
