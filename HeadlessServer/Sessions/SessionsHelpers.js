class SessionHelpers {
  constructor() {}

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
    // Sometimes split into two segments (50% chance)
    const doSplit = Math.random() < 0.5;

    // Get current mouse start (fallback if unknown)
    const start = { x: 0, y: 0 };

    // Intermediate waypoint if splitting
    let waypoints = [{ x, y }];
    if (doSplit) {
      // pick a point 60–80% along the way with random offset
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
      const steps = 15 + Math.floor(Math.random() * 10); // 15–25 steps
      const deltaX = (point.x - start.x) / steps;
      const deltaY = (point.y - start.y) / steps;

      for (let i = 1; i <= steps; i++) {
        const moveX = start.x + deltaX * i + (Math.random() - 0.5) * 3; // jitter
        const moveY = start.y + deltaY * i + (Math.random() - 0.5) * 3;

        await page.mouse.move(moveX, moveY);
        await this.moveCursorOverlay(page, moveX, moveY);
        await new Promise(
          (res) => setTimeout(res, 5 + Math.random() * 15) // 5–20ms delay
        );
      }
      start.x = point.x;
      start.y = point.y;
    }
  }

  async humanLikeClick(page) {
    await page.mouse.down();
    await new Promise((res) => setTimeout(res, 50 + Math.random() * 120)); // hold 50–170ms
    await page.mouse.up();
  }

  async pauseFirstVideo(page) {
    try {
      const video = await page.$("video");
      if (video) {
        const box = await video.boundingBox();
        if (box) {
          await this.humanLikeMoveMouse(
            page,
            box.x + box.width / 2,
            box.y + box.height / 2
          );
          await this.humanLikeClick(page);
          console.log("⏸️ Paused first video with human-like click");
        }
      }
    } catch (e) {
      console.log("⚠️ Could not pause video:", e.message);
    }
  }

  async scroll(page, times = 5, chance = 0.15) {
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

      if (Math.random() < chance) {
        await this.likeVideo(page);
      }
    }
  }

  async likeVideo(page) {
    try {
      const btns = await page.$$('button[aria-label*="Like"]');
      for (const btn of btns) {
        await btn.evaluate((el) =>
          el.scrollIntoView({ behavior: "smooth", block: "center" })
        );
        const box = await btn.boundingBox();

        if (box && box.y >= 0 && box.y < 900) {
          const x = box.x + box.width / 2 + (Math.random() - 0.5) * 5;
          const y = box.y + box.height / 2 + (Math.random() - 0.5) * 5;

          // ✅ use human-like click instead of raw mouse
          await this.humanLikeMoveMouse(page, x, y);
          await this.humanLikeClick(page);

          // confirm it's liked
          await new Promise((r) => setTimeout(r, 500));
          const label = await btn.evaluate((el) =>
            el.getAttribute("aria-label")
          );

          if (label && label.toLowerCase().includes("unlike")) {
            console.log(
              `❤️ Liked video at (${Math.round(x)}, ${Math.round(y)})`
            );
            return true;
          } else {
            console.log("⚠️ First click didn’t stick, retrying once...");
            await this.humanLikeMoveMouse(page, x, y);
            await this.humanLikeClick(page);
          }

          return true;
        }
      }
      console.log("⚠️ No like button found on screen");
      return false;
    } catch (e) {
      console.log("⚠️ Error trying to like video:", e.message);
      return false;
    }
  }
}

export default SessionHelpers;
