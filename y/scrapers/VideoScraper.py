import requests, json, datetime, argparse, sqlite3, random, sys, time
from pathlib import Path
from backend.db.db_videos import init_videos_db, save_scraped_video

# ---------- DB PATHS ----------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "crm.db"
DB_PATH_VIDEOS = BASE_DIR / "videos.db"

print("Accounts DB:", DB_PATH.resolve())
print("Videos DB:", DB_PATH_VIDEOS.resolve())

# ---------- USER AGENTS ----------
USER_AGENTS = {
    "mac_chrome": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/139.0.0.0 Safari/537.36"
    ),
}

def choose_user_agent():
    return USER_AGENTS["mac_chrome"]

# ---------- COOKIE FETCH ----------
def get_account_cookies(account_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT cookies FROM accounts WHERE id=?", (account_id,))
    row = c.fetchone()
    conn.close()
    if not row or not row[0]:
        raise RuntimeError(f"No cookies found for account {account_id}")
    return json.loads(row[0])

# ---------- SIGNERS ----------
def sign_xbogus(url: str, ua: str):
    try:
        r = requests.post(
            "http://127.0.0.1:8080/sign",
            json={"url": url, "userAgent": ua},
            timeout=10
        )
        data = r.json()
        print("[DEBUG signer response]", data, file=sys.stderr)
        return data
    except Exception as e:
        print(json.dumps({"error": "sign_error", "message": str(e)}), flush=True)
        sys.exit(1)

def sign_gnarly(url: str, ua: str, body: str = ""):
    try:
        r = requests.post(
            "http://127.0.0.1:8080/gnarly",
            json={"queryString": url, "body": body, "userAgent": ua},
            timeout=10
        )
        data = r.json()
        print("[DEBUG gnarly response]", data, file=sys.stderr)
        return data.get("X-Gnarly")
    except Exception as e:
        print(json.dumps({"error": "gnarly_error", "message": str(e)}), flush=True)
        sys.exit(1)

# ---------- SCRAPER ----------
def scrape_hashtag(hashtag, account_id=None, max_pages=1):
    init_videos_db()
    all_videos = []
    cutoff = datetime.datetime.now() - datetime.timedelta(days=60)

    cookies = get_account_cookies(account_id)
    ua = choose_user_agent()

    # Shared headers
    headers = {
        "User-Agent": ua,
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "priority": "u=1, i",
        "sec-ch-ua": '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
    }
    print(f"[HUMANIZE] Using User-Agent: {ua}", file=sys.stderr)

    device_id = str(random.randint(7e18, 8e18))
    odinId = cookies.get("multi_sids", "").split(":")[0] or "6838550807294575622"
    msToken = cookies.get("msToken", "")
    ttwid = cookies.get("ttwid", "")

    ab_versions = (
        "70508271,72437276,73485603,73547759,73563784,"
        "73720540,74163180,74189059,74214203,74245489,"
        "74297372,74329864,74334482,74355468,74377570,"
        "74405886,74406103,74433936,74457380,74463132,"
        "74464824,74467848,74486762,74503130,74515742"
    )

    for page in range(max_pages):
        print(f"[INFO] Fetching page {page+1} for #{hashtag}", file=sys.stderr)

        t_param = int(time.time() * 1000)

        base_url = (
            "https://www.tiktok.com/api/preload/item_list/"
            f"?WebIdLastTime={int(time.time())}"
            f"&aid=1988"
            f"&app_language=en"
            f"&app_name=tiktok_web"
            f"&browser_language=en-US"
            f"&browser_name=Mozilla"
            f"&browser_online=true"
            f"&browser_platform=MacIntel"
            f"&browser_version=5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)"
            "%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)"
            "%20Chrome%2F139.0.0.0%20Safari%2F537.36"
            f"&channel=tiktok_web"
            f"&clientABVersions={ab_versions}"
            f"&cookie_enabled=true"
            f"&count=20"
            f"&coverFormat=2"
            f"&cursor={page*20}"
            f"&data_collection_enabled=true"
            f"&device_id={device_id}"
            f"&device_platform=web_pc"
            f"&device_score=7.8"
            f"&focus_state=false"
            f"&from_page=search"
            f"&history_len={page+1}"
            f"&isNonPersonalized=false"
            f"&is_fullscreen=false"
            f"&is_page_visible=true"
            f"&language=en"
            f"&launch_mode=direct"
            f"&network=10"
            f"&odinId={odinId}"
            f"&os=mac"
            f"&priority_region=HR"
            f"&referer=https%3A%2F%2Fwww.tiktok.com%2Fsearch%3Fq%3D%2523{hashtag}%26t%3D{t_param}"
            f"&region=HR"
            f"&screen_height=956"
            f"&screen_width=1470"
            f"&tz_name=Europe%2FZagreb"
            f"&user_is_login=true"
            f"&vv_count_fyp=35"
            f"&webcast_language=en"
            f"&window_height=798"
            f"&window_width=977"
        )

        if msToken:
            base_url += f"&msToken={msToken}"
        if ttwid:
            base_url += f"&ttwid={ttwid}"

        # Get dynamic X-Gnarly
        gnarly_token = sign_gnarly(base_url, ua)
        if gnarly_token:
            base_url += f"&X-Gnarly={gnarly_token}"

        # Sign with X-Bogus
        signer_data = sign_xbogus(base_url, ua)
        if "signed_url" not in signer_data:
            print("[ERROR] Signer did not return signed_url", file=sys.stderr)
            continue
        signed_url = signer_data["signed_url"]

        if "x-tt-params" in signer_data:
            headers["x-tt-params"] = signer_data["x-tt-params"]

        # Debug curl
        curl_cmd = [
            "curl", f"'{signed_url}'",
            "-H", f"'user-agent: {ua}'",
            "-H", "'accept: */*'",
            "-H", "'accept-language: en-US,en;q=0.9'",
            "-H", f"'referer: https://www.tiktok.com/search?q=%23{hashtag}&t={t_param}'",
            "-b", f"'{'; '.join([f'{k}={v}' for k,v in cookies.items()])}'",
        ]
        print("[DEBUG curl]", " ".join(curl_cmd), file=sys.stderr)
        print(f"[INFO] Signed URL: {signed_url}", file=sys.stderr)

        resp = requests.get(signed_url, headers=headers, cookies=cookies, timeout=20)
        if resp.status_code != 200:
            print(json.dumps({"error": "http_error", "message": resp.text[:200]}))
            sys.exit(1)

        try:
            data = resp.json()
            print("[DEBUG json keys]", list(data.keys()), file=sys.stderr)
            print("[DEBUG snippet]", json.dumps(data)[:400], file=sys.stderr)
        except:
            snippet = resp.text[:200].replace("\n", " ")
            print(json.dumps({"error": "not_json", "message": snippet}))
            sys.exit(2)

        items = data.get("itemList", [])
        print(f"[INFO] Got {len(items)} videos", file=sys.stderr)

        for v in items:
            created_at = datetime.datetime.fromtimestamp(v.get("createTime", 0))
            if created_at <= cutoff:
                continue
            video_id = v.get("id")
            author = v.get("author", {}).get("uniqueId", "unknown")
            url = f"https://www.tiktok.com/@{author}/video/{video_id}"
            save_scraped_video({
                "id": video_id,
                "account_id": account_id,
                "hashtag": hashtag,
                "desc": v.get("desc"),
                "url": url,
                "views": v.get("stats", {}).get("playCount"),
                "likes": v.get("stats", {}).get("diggCount"),
                "comments": v.get("stats", {}).get("commentCount"),
                "shares": v.get("stats", {}).get("shareCount"),
                "created_at": created_at.isoformat(),
                "scraped_at": datetime.datetime.now().isoformat()
            })
            all_videos.append(video_id)
            print(f"[SAVE] {video_id}", file=sys.stderr)

        time.sleep(random.uniform(3, 8))

    return all_videos

# ---------- MAIN ----------
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--hashtag", required=True)
    parser.add_argument("--account", type=int, required=True)
    parser.add_argument("--pages", type=int, default=1)
    args = parser.parse_args()

    videos = scrape_hashtag(
        account_id=args.account,
        hashtag=args.hashtag,
        max_pages=args.pages
    )
    print(json.dumps({"status": "ok", "videos": len(videos)}))
