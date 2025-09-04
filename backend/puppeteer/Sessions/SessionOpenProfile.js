class SessionOpenProfile {
  constructor(sessionHelpers, page) {
    this.sessionHelpers = sessionHelpers;
    this.page = page;
  }
  async browseProfile() {
    try {
      const links = await this.page.$$('a[data-e2e="video-author-avatar"]');
      for (const link of links) {
        const box = await link.boundingBox();
        if (box && box.y >= 0 && box.y < 900) {
          const x = box.x + box.width / 2 + (Math.random() - 0.5) * 4;
          const y = box.y + box.height / 2 + (Math.random() - 0.5) * 4;

          await this.sessionHelpers.humanLikeMoveMouse(this.page, x, y);
          await this.sessionHelpers.humanLikeClick(this.page);
          console.log(
            `👤 Opened profile at (${Math.round(x)}, ${Math.round(y)})`
          );

          // ✅ Wait for profile grid instead of navigation
          await this.page.waitForSelector(
            '[id^="column-item-video-container-"]',
            {
              timeout: 30000,
            }
          );

          const thumbs = await this.page.$$(
            '[id^="column-item-video-container-"]'
          );
          if (thumbs.length === 0) {
            console.log("⚠️ No video thumbnails found on profile");
            return;
          }

          // pick random video
          const pickIndex = Math.floor(
            Math.random() * Math.min(3, thumbs.length)
          );
          const chosen = thumbs[pickIndex];
          const box2 = await chosen.boundingBox();

          if (box2) {
            const vx = box2.x + box2.width / 2 + (Math.random() - 0.5) * 5;
            const vy = box2.y + box2.height / 2 + (Math.random() - 0.5) * 5;

            await this.sessionHelpers.humanLikeMoveMouse(this.page, vx, vy);
            await this.sessionHelpers.humanLikeClick(this.page);
            console.log(`▶️ Opened video #${pickIndex + 1} from profile`);

            await this.sessionHelpers.moveMouseToFirstVideo(this.page);

            await this.page.waitForSelector("video", { timeout: 10000 });

            const scrolls = 2 + Math.floor(Math.random() * 3);
            await this.sessionHelpers.scroll(this.page, scrolls);
            console.log(`📜 Watched ${scrolls} videos inside profile`);
          }
          let chanceToReturnToFyp = 0.5;
          if (Math.random() < chanceToReturnToFyp) {
            await this.returnToFyp();
            return;
          } else {
            return;
          }
        }
      }
      console.log("⚠️ No visible profile avatar found in viewport");
    } catch (e) {
      console.log("⚠️ Error in browseProfile:", e.message);
    }
  }

  async returnToFyp() {
    try {
      // 1. Close video if it's open
      const closeBtn = await this.page.$('button[data-e2e="browse-close"]');
      if (closeBtn) {
        const box = await closeBtn.boundingBox();
        if (box) {
          const x = box.x + box.width / 2 + (Math.random() - 0.5) * 4;
          const y = box.y + box.height / 2 + (Math.random() - 0.5) * 4;

          await this.sessionHelpers.humanLikeMoveMouse(this.page, x, y);
          await this.sessionHelpers.humanLikeClick(this.page);

          console.log(
            `❌ Closed video modal at (${Math.round(x)}, ${Math.round(y)})`
          );
          await new Promise((res) =>
            setTimeout(res, 1000 + Math.random() * 1000)
          );
        }
      }

      // 2. Click "For You" button
      const fypBtn = await this.page.$('button[aria-label="For You"]');
      if (fypBtn) {
        const box = await fypBtn.boundingBox();
        if (box) {
          const x = box.x + box.width / 2 + (Math.random() - 0.5) * 4;
          const y = box.y + box.height / 2 + (Math.random() - 0.5) * 4;

          await this.sessionHelpers.humanLikeMoveMouse(this.page, x, y);
          await this.sessionHelpers.humanLikeClick(this.page);

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

  async runSession() {
    await this.browseProfile();
    const chanceToScrollOnFyp = 0.5;
    if (Math.random() < chanceToScrollOnFyp) {
      return true;
    }
    return false;
  }
}

export default SessionOpenProfile;
