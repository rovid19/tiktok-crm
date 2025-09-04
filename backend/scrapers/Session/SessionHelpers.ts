class SessionHelpers {
  lastMousePos;
  constructor() {
    this.lastMousePos = { x: 0, y: 0 };
    console.log("sessionhelpers constructor", this.lastMousePos);
  }

  // RED CURSOR TEST FOR TESTING
  async injectCursor(page) {
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

  async moveCursorOverlay(page, x, y) {
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
  async humanLikeMoveMouse(page, x, y) {
    const start = { ...this.lastMousePos }; // use last position, not (0,0)

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
        await this.moveCursorOverlay(page, moveX, moveY);
        await new Promise((res) => setTimeout(res, 5 + Math.random() * 15));
      }
      start.x = point.x;
      start.y = point.y;
    }

    // update last position
    this.lastMousePos = { x, y };
  }

  async humanLikeClick(page) {
    await page.mouse.down();
    await new Promise((res) => setTimeout(res, 50 + Math.random() * 120)); // hold 50–170ms
    await page.mouse.up();
  }

  async moveMouseToFirstVideo(page) {
    try {
      const video = await page.$("video");
      if (video) {
        const box = await page.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        }, video);

        if (box) {
          // Just move mouse to video area (center of the video)
          await this.humanLikeMoveMouse(
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
  async scroll(page, times = 5, chance = 0.9) {
    for (let i = 0; i < times; i++) {
      const deltaY = 800 + Math.random() * 200;
      const deltaX = (Math.random() - 0.5) * 40;

      await page.mouse.wheel({ deltaY, deltaX });
      console.log(
        `⬇️ Scrolled one video (dx=${Math.round(deltaX)}, dy=${Math.round(
          deltaY
        )})`
      );

      // wait 500-1500ms
      await new Promise((res) =>
        setTimeout(res, Math.floor(Math.random() * (1500 - 500) + 500))
      );

      let isLiked = false;

      // 10% chance to like a video before it ends
      if (Math.random() < chance) {
        await this.likeVideo(page);
        isLiked = true;
      }

      // wait 2000-7000ms
      await new Promise((res) =>
        setTimeout(res, Math.floor(Math.random() * (7000 - 2000) + 2000))
      );

      // 10% chance to like a video after it ends if it hasnt been liked before watching
      if (!isLiked && Math.random() < chance) {
        await this.likeVideo(page);
      }
    }
  }

  async likeVideo(page) {
    try {
      // selectors for FYP + profile
      const selectors = [
        'button[aria-label*="Like video"]', // FYP
        'button[aria-label*="Likes"]', // Profile
        'button span[data-e2e="like-icon"]', // FYP fallback
        'button span[data-e2e="browse-like-icon"]', // Profile fullscreen
      ];

      let candidates = [];
      for (const selector of selectors) {
        const found = await page.$$(selector);
        if (found.length > 0) {
          candidates = candidates.concat(found);
        }
      }

      if (candidates.length === 0) {
        console.log("⚠️ No like button found — skipping");
        return false;
      }

      // find first button that is actually visible in viewport
      let btn = null;
      for (const el of candidates) {
        const box = await page.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        }, el);

        if (box && box.y >= 0 && box.y < 900) {
          // only in viewport range
          btn = el;
          break;
        }
      }

      if (!btn) {
        console.log("⚠️ No visible like button in viewport — skipping");
        return false;
      }

      const box = await page.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      }, btn);

      const x = box.x + box.width / 2 + (Math.random() - 0.5) * 5;
      const y = box.y + box.height / 2 + (Math.random() - 0.5) * 5;

      await this.humanLikeMoveMouse(page, x, y);
      await this.humanLikeClick(page);

      console.log(
        `❤️ Clicked visible like button at (${Math.round(x)}, ${Math.round(y)})`
      );

      // move mouse back into video area
      await this.moveMouseToFirstVideo(page);

      return true;
    } catch (e) {
      console.log("⚠️ Error in likeVideo:", e.message);
      return false;
    }
  }
}

export default SessionHelpers;
