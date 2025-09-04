import SessionHelpers from "./SessionHelpers.ts";

class SessionOpenSearch {
  sessionHelpers: SessionHelpers;
  page: any;

  constructor(sessionHelpers: SessionHelpers, page: any) {
    this.sessionHelpers = sessionHelpers;
    this.page = page;
  }

  async searchForHashtag(page: any, hashtag: string) {
    try {
      let requestCaptured: string | null = null;
      // --- 1. Attach one-time listener ---
      const requestHandler = async (req: any) => {
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
          requestCaptured = curl;

          // Remove listener after first match
          page.off("request", requestHandler);
        }
      };
      page.on("request", requestHandler);

      // --- 2. Find and click search ---
      const rect = await page.evaluate(() => {
        const el = Array.from(
          document.querySelectorAll("div.TUXButton-label")
        ).find((e) => e.textContent?.trim() === "Search");
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
      await this.sessionHelpers.humanLikeMoveMouse(page, x, y);
      await this.sessionHelpers.humanLikeClick(page);
      console.log("🔍 Opened search box");

      for (const char of hashtag) {
        await page.keyboard.type(char, { delay: 100 + Math.random() * 200 });
      }
      console.log(`⌨️ Typed hashtag: ${hashtag}`);
      await page.keyboard.press("Enter");

      // scroll if chance is met
      if (Math.random() < 0.4) {
        console.log("Scrolling");
        const scrollTimes = Math.floor(Math.random() * (4 - 2 + 1)) + 2;
        await this.sessionHelpers.scroll(page, scrollTimes);
        console.log(`✅ Scrolled ${scrollTimes} times`);
      } else {
        await new Promise((res) => setTimeout(res, 4000));
      }

      if (!requestCaptured) {
        console.log("⏳ Waiting for /list/? request...");
        await new Promise((res) => setTimeout(res, 8000)); // idle to catch request
      } else {
        return;
      }
    } catch (e) {
      console.log("⚠️ Could not search hashtag:", e.message);
    }
  }

  async runSession() {
    await this.searchForHashtag(this.page, "#funny");

    return false;
  }
}

export default SessionOpenSearch;
