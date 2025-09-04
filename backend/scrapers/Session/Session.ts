import SessionHelpers from "./SessionHelpers.ts";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import SessionFYP from "./SessionFYP.ts";
import SessionOpenSearch from "./SessionOpenSearch.ts";
import SessionOpenProfile from "./SessionOpenProfile.ts";

class Session {
  sessionHelpers = new SessionHelpers();
  randomSession: SessionFYP | SessionOpenSearch | SessionOpenProfile;
  page: any;
  browserPort: number | null = null;
  accountId: number | null = null;

  constructor(browserPort: number, accountId: number) {
    console.log("Session constructor", browserPort);
    this.browserPort = browserPort;
    this.accountId = accountId;
  }

  chooseRandomSession() {
    const randomNumber = Math.floor(Math.random() * 3) + 1;
    switch (randomNumber) {
      case 1:
        console.log("SessionFYP");
        this.randomSession = new SessionFYP(this.sessionHelpers, this.page);
        break;
      case 2:
        console.log("SessionOpenSearch");
        this.randomSession = new SessionOpenSearch(
          this.sessionHelpers,
          this.page
        );
        break;
      case 3:
        console.log("SessionOpenProfile");
        this.randomSession = new SessionOpenProfile(
          this.sessionHelpers,
          this.page
        );
        break;
    }
  }

  async scrollFypOnceMore() {
    await this.sessionHelpers.moveMouseToFirstVideo(this.page);
    const scrollTimes = Math.floor(Math.random() * (8 - 2 + 1)) + 2;
    await this.sessionHelpers.scroll(this.page, scrollTimes);
  }

  async runSession() {
    // 1. Launch Chrome via backend
    const launchUrl = `http://localhost:3000/api/accounts/${this.accountId}/launch_profile`;
    console.log(`🚀 Calling launchProfile: ${launchUrl}`);

    const resp = await fetch(launchUrl, { method: "POST" });
    if (!resp.ok) {
      throw new Error(`Failed to launch profile: ${resp.statusText}`);
    }

    puppeteer.use(StealthPlugin());

    // 2. Retry loop until Chrome opens the debugging port
    const browserURL = `http://127.0.0.1:${this.browserPort}`;
    let browser;
    for (let i = 0; i < 10; i++) {
      try {
        browser = await puppeteer.connect({
          browserURL,
          defaultViewport: null,
        });
        console.log(`✅ Connected to Chrome on attempt ${i + 1}`);
        break;
      } catch (err) {
        console.log(`⏳ Waiting for Chrome... attempt ${i + 1}`);
        await new Promise((res) => setTimeout(res, 1000));
      }
    }

    if (!browser) {
      throw new Error(`❌ Could not connect to Chrome on ${browserURL}`);
    }

    // 3. Get or create a page
    const pages = await browser.pages();
    let page = pages.find((p) => p.url() !== "about:blank");

    if (!page) {
      page = await browser.newPage();
    }

    this.page = page;

    // red cursor for testing
    await this.sessionHelpers.injectCursor(this.page);

    // wait 3-6 seconds to continue
    await new Promise((res) =>
      setTimeout(res, Math.floor(Math.random() * (6000 - 3000) + 3000))
    );

    // FLOW
    await this.sessionHelpers.moveMouseToFirstVideo(this.page);
    const scrollTimes = Math.floor(Math.random() * (8 - 2 + 1)) + 2;
    await this.sessionHelpers.scroll(this.page, scrollTimes);

    this.chooseRandomSession();
    const shouldScrollOnFyp = await this.randomSession.runSession();
    if (shouldScrollOnFyp) {
      await this.scrollFypOnceMore();
    }

    await browser.close();
  }
}

export default Session;
