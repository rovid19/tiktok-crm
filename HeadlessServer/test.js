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
let lastMousePos = { x: 0, y: 0 };

async function humanLikeMoveMouse(page, x, y) {
  const start = { ...lastMousePos };
  const doSplit = Math.random() < 0.5;

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
  lastMousePos = { x, y };
}

async function humanLikeClick(page) {
  await page.mouse.down();
  await new Promise((res) => setTimeout(res, 50 + Math.random() * 120));
  await page.mouse.up();
}

// --- Pause video ---
async function moveMouseToFirstVideo(page) {
  try {
    const video = await page.$("video");
    if (video) {
      const box = await video.boundingBox();
      if (box) {
        // Just move mouse to video area (center of the video)
        await humanLikeMoveMouse(
          page,
          box.x + box.width / 2,
          box.y + box.height / 2
        );
        console.log("🖱️ Moved mouse into first video (scroll area ready)");
      } else {
        console.log("⚠️ Could not get bounding box for video");
      }
    } else {
      console.log("⚠️ No video element found on screen");
    }
  } catch (e) {
    console.log("⚠️ Could not move mouse to first video:", e.message);
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

// --- Search for hashtag ---
async function searchForHashtag(page, hashtag) {
  try {
    // --- 2. Find and click search ---
    const rect = await page.evaluate(() => {
      const el = Array.from(
        document.querySelectorAll("div.TUXButton-label")
      ).find((e) => e.textContent.trim() === "Search");
      if (!el) return null;
      const box = el.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    });

    if (!rect) {
      console.log("⚠️ Search button not found");
      return;
    }

    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    await humanLikeMoveMouse(page, x, y);
    await humanLikeClick(page);
    console.log("🔍 Opened search box");

    for (const char of hashtag) {
      await page.keyboard.type(char, { delay: 100 + Math.random() * 200 });
    }
    console.log(`⌨️ Typed hashtag: ${hashtag}`);
    await page.keyboard.press("Enter");

    // scroll if chance is met
    let scrollChance = 0.4;
    if (Math.random() < scrollChance) {
      const scrollTimes = Math.floor(Math.random() * (4 - 2 + 1)) + 2;
      await scrollFYP(page, scrollTimes);
      console.log(`✅ Scrolled ${scrollTimes} times`);
    }

    // --- 3. Wait until we see the request ---
    await new Promise((res) => setTimeout(res, 2000));
    page.on("request", async (req) => {
      const url = req.url();
      if (url.includes("/list/?")) {
        const headers = req.headers();

        // Collect cookies from Puppeteer
        const cookies = await page.cookies();
        const cookieHeader = cookies
          .map((c) => `${c.name}=${c.value}`)
          .join("; ");

        // Build curl
        const curl =
          `curl '${url}' ` +
          `-H 'user-agent: ${headers["user-agent"]}' ` +
          `-H 'accept: ${headers["accept"] || "*/*"}' ` +
          `-H 'referer: https://www.tiktok.com/' ` +
          `-b '${cookieHeader}'`;

        console.log("📡 CURL Command:\n", curl);
      }
    });
  } catch (e) {
    console.log("⚠️ Could not search hashtag:", e.message);
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

  await injectCursor(page);

  await new Promise((res) =>
    setTimeout(res, Math.floor(Math.random() * (6000 - 3000) + 3000))
  );

  await moveMouseToFirstVideo(page);

  const scrollTimes = Math.floor(Math.random() * (4 - 2 + 1)) + 2;
  await scrollFYP(page, scrollTimes);
  console.log(`✅ Did ${scrollTimes} scrolls on FYP`);

  // 🔍 Now search for a hashtag
  await searchForHashtag(page, "#funny");
})();
