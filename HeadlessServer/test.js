// fypScrollPauseLikeMouse.js
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

puppeteer.use(StealthPlugin());

// resolve folder of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Inject red dot cursor into page ---
async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById("puppeteer-cursor")) return;
    const cursor = document.createElement("div");
    cursor.id = "puppeteer-cursor";
    cursor.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 12px;
      height: 12px;
      background: red;
      border-radius: 50%;
      z-index: 999999;
      pointer-events: none;
      transition: top 0.05s linear, left 0.05s linear;
    `;
    document.body.appendChild(cursor);
  });
}

async function moveCursorOverlay(page, x, y) {
  await page.evaluate(
    ({ x, y }) => {
      const cursor = document.getElementById("puppeteer-cursor");
      if (cursor) {
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
      }
    },
    { x, y }
  );
}

// --- Human-like helpers ---
// keep last mouse position globally
let lastMousePos = { x: 0, y: 0 };

// --- Human-like helpers ---
async function humanLikeMoveMouse(page, x, y) {
  const start = { ...lastMousePos }; // use last position, not (0,0)

  // Sometimes split into two segments (50% chance)
  const doSplit = Math.random() < 0.5;

  // Intermediate waypoint if splitting
  let waypoints = [{ x, y }];
  if (doSplit) {
    const progress = 0.6 + Math.random() * 0.2;
    const midX =
      start.x + (x - start.x) * progress + (Math.random() - 0.5) * 50;
    const midY =
      start.y + (y - start.y) * progress + (Math.random() - 0.5) * 50;
    waypoints = [
      { x: midX, y: midY },
      { x, y },
    ];
  }

  // Move through each waypoint
  for (const point of waypoints) {
    const steps = 15 + Math.floor(Math.random() * 10);
    const deltaX = (point.x - start.x) / steps;
    const deltaY = (point.y - start.y) / steps;

    for (let i = 1; i <= steps; i++) {
      const moveX = start.x + deltaX * i + (Math.random() - 0.5) * 3;
      const moveY = start.y + deltaY * i + (Math.random() - 0.5) * 3;

      await page.mouse.move(moveX, moveY);
      await moveCursorOverlay(page, moveX, moveY);
      await new Promise((res) => setTimeout(res, 5 + Math.random() * 15));
    }
    start.x = point.x;
    start.y = point.y;
  }

  // update last position
  lastMousePos = { x, y };
}

async function humanLikeClick(page) {
  await page.mouse.down();
  await new Promise((res) => setTimeout(res, 50 + Math.random() * 120)); // hold 50–170ms
  await page.mouse.up();
}

// --- Pause video ---
async function pauseFirstVideo(page) {
  try {
    const video = await page.$("video");
    if (video) {
      const box = await video.boundingBox();
      if (box) {
        await humanLikeMoveMouse(
          page,
          box.x + box.width / 2,
          box.y + box.height / 2
        );
        await humanLikeClick(
          page,
          box.x + box.width / 2,
          box.y + box.height / 2
        );
        console.log("⏸️ Paused first video with human-like click");
      }
    }
  } catch (e) {
    console.log("⚠️ Could not pause video:", e.message);
  }
}

// --- Scroll FYP ---
async function scrollFYP(page, times = 5) {
  for (let i = 0; i < times; i++) {
    const deltaY = 800 + Math.random() * 200;
    const deltaX = (Math.random() - 0.5) * 40;

    await page.mouse.wheel({ deltaY, deltaX });
    console.log(
      `⬇️ Scrolled one video (dx=${Math.round(deltaX)}, dy=${Math.round(
        deltaY
      )})`
    );

    await new Promise((res) =>
      setTimeout(res, Math.floor(Math.random() * (7000 - 2000) + 2000))
    );
  }
}

// --- Open Random Profile ---
async function browseProfile(page) {
  try {
    const links = await page.$$('a[data-e2e="video-author-avatar"]');
    for (const link of links) {
      const box = await link.boundingBox();
      if (box && box.y >= 0 && box.y < 900) {
        const x = box.x + box.width / 2 + (Math.random() - 0.5) * 4;
        const y = box.y + box.height / 2 + (Math.random() - 0.5) * 4;

        await humanLikeMoveMouse(page, x, y);
        await humanLikeClick(page, x, y);
        console.log(
          `👤 Opened profile at (${Math.round(x)}, ${Math.round(y)})`
        );

        await page.waitForSelector('[id^="column-item-video-container-"]', {
          timeout: 30000,
        });

        const thumbs = await page.$$('[id^="column-item-video-container-"]');
        if (thumbs.length === 0) {
          console.log("⚠️ No video thumbnails found on profile");
          return;
        }

        const pickIndex = Math.floor(
          Math.random() * Math.min(3, thumbs.length)
        );
        const chosen = thumbs[pickIndex];
        const box2 = await chosen.boundingBox();

        if (box2) {
          const vx = box2.x + box2.width / 2 + (Math.random() - 0.5) * 5;
          const vy = box2.y + box2.height / 2 + (Math.random() - 0.5) * 5;
          await humanLikeMoveMouse(page, vx, vy);
          await humanLikeClick(page, vx, vy);
          const opened = await page
            .waitForSelector('span[data-e2e="browse-like-icon"]', {
              timeout: 5000,
            })
            .catch(() => null);

          if (!opened) {
            console.log("⚠️ Missed click, retrying...");
            await chosen.click({ delay: 50 }); // fallback reliable click
            await page.waitForSelector('button[data-e2e="browse-like-icon"]', {
              timeout: 5000,
            });
          }

          console.log(`▶️ Opened video #${pickIndex + 1} from profile`);

          await page.waitForSelector("video", { timeout: 10000 });

          const scrolls = 2 + Math.floor(Math.random() * 3);
          await scrollFYP(page, scrolls);
          console.log(`📜 Watched ${scrolls} videos inside profile`);
        }
        let chanceToReturnToFyp = 1;
        if (Math.random() < chanceToReturnToFyp) {
          console.log("Returning to FYP");
          await returnToFyp(page);
          return;
        } else {
          console.log("Not returning to FYP");
          return;
        }
      }
    }
    console.log("⚠️ No visible profile avatar found in viewport");
  } catch (e) {
    console.log("⚠️ Error in browseProfile:", e.message);
  }
}

async function returnToFyp(page) {
  try {
    const closeBtn = await page.$('button[data-e2e="browse-close"]');
    if (closeBtn) {
      const box = await closeBtn.boundingBox();
      if (box) {
        const x = box.x + box.width / 2 + (Math.random() - 0.5) * 4;
        const y = box.y + box.height / 2 + (Math.random() - 0.5) * 4;
        await humanLikeMoveMouse(page, x, y);
        await humanLikeClick(page, x, y);

        console.log(
          `❌ Closed video modal at (${Math.round(x)}, ${Math.round(y)})`
        );
        await new Promise((res) =>
          setTimeout(res, 1000 + Math.random() * 1000)
        );
      }
    }

    const fypBtn = await page.$('button[aria-label="For You"]');
    if (fypBtn) {
      const box = await fypBtn.boundingBox();
      if (box) {
        const x = box.x + box.width / 2 + (Math.random() - 0.5) * 4;
        const y = box.y + box.height / 2 + (Math.random() - 0.5) * 4;

        await humanLikeMoveMouse(page, x, y);
        await humanLikeClick(page, x, y);

        console.log(
          `🏠 Returned to For You at (${Math.round(x)}, ${Math.round(y)})`
        );
      }
    } else {
      console.log("⚠️ Could not find 'For You' button");
    }
  } catch (e) {
    console.log("⚠️ Error in returnToFyp:", e.message);
  }
}

// --- MAIN FLOW ---
(async () => {
  const browser = await puppeteer.connect({
    browserURL: "http://127.0.0.1:9222",
    defaultViewport: null,
  });

  const pages = await browser.pages();
  let page = pages.find((p) => p.url() !== "about:blank");

  if (!page) {
    page = await browser.newPage();
    await page.goto("https://www.tiktok.com/foryou", {
      waitUntil: "networkidle2",
    });
  }

  console.log("🌍 Attached to CRM Chrome profile with TikTok logged in");

  // inject red cursor overlay
  await injectCursor(page);

  await new Promise((res) =>
    setTimeout(res, Math.floor(Math.random() * (6000 - 3000) + 3000))
  );

  await pauseFirstVideo(page);

  const scrollTimes = Math.floor(Math.random() * (12 - 2 + 1)) + 2;
  await scrollFYP(page, scrollTimes);
  console.log(`✅ Did ${scrollTimes} scrolls on FYP`);

  await browseProfile(page);
})();
