import SessionHelpers from "./SessionHelpers.js";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import SessionFYP from "./SessionFYP.js";
import SessionOpenSearch from "./SessionOpenSearch.js";
import SessionOpenProfile from "./SessionOpenProfile.js";

class Session {
  sessionHelpers = new SessionHelpers();
  randomSession;
  page;

  chooseRandomSession() {
    const randomNumber = 3;
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
    puppeteer.use(StealthPlugin());

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

    this.page = page;

    // red cursor for testing
    await this.sessionHelpers.injectCursor(this.page);

    // wait 3-6 seconds to continue
    await new Promise((res) =>
      setTimeout(res, Math.floor(Math.random() * (6000 - 3000) + 3000))
    );

    //FLOW
    await this.sessionHelpers.moveMouseToFirstVideo(this.page);
    const scrollTimes = Math.floor(Math.random() * (8 - 2 + 1)) + 2;
    await this.sessionHelpers.scroll(this.page, scrollTimes);
    //RANDOM BEHAVIOURS
    this.chooseRandomSession();
    //randomSession run uvijek vraca true ili false
    const shouldScrollOnFyp = await this.randomSession.runSession();
    if (shouldScrollOnFyp) {
      await this.scrollFypOnceMore();
    }
    await browser.close();
  }
}

export default Session;
