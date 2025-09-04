from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync
import time, random

def swipe_up(page, steps=20):
    client = page.context.new_cdp_session(page)
    for _ in range(steps):
        client.send("Input.dispatchMouseEvent", {
            "type": "mouseWheel",
            "x": 500,
            "y": 400,
            "deltaX": 0,
            "deltaY": 120,
            "modifiers": 0,
            "pointerType": "mouse"
        })
        time.sleep(0.01)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()

    stealth_sync(page)  # ✅ works on v1.0.6

    page.goto("https://www.tiktok.com/foryou")
    time.sleep(5)

    for _ in range(10):
        swipe_up(page, steps=random.randint(15, 25))
        time.sleep(random.uniform(3, 6))

    time.sleep(5)
    browser.close()
