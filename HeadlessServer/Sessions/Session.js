import SessionHelpers from "./SessionHelpers";
import puppeteer from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import SessionFYP from "./SessionFYP";
import SessionOpenSearch from "./SessionOpenSearch";
import SessionOpenProfile from "./SessionOpenProfile";

class Session {
  sessionHelpers = new SessionHelpers();
  randomSession;
  page;

  chooseRandomSession() {
    const randomNumber = Math.floor(Math.random() * 3) + 1;
    switch (randomNumber) {
      case 1:
        this.randomSession = new SessionFYP();
        break;
      case 2:
        this.randomSession = new SessionOpenSearch();
        break;
      case 3:
        this.randomSession = new SessionOpenProfile();
        break;
    }
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

    // wait 3-6 seconds to continue
    await new Promise((res) =>
      setTimeout(res, Math.floor(Math.random() * (6000 - 3000) + 3000))
    );

    //FLOW
    await this.sessionHelpers.pauseFirstVideo(this.page);
    const scrollTimes = Math.floor(Math.random() * (8 - 2 + 1)) + 2;
    await this.sessionHelpers.scroll(this.page, scrollTimes);
    //RANDOM BEHAVIOURS
    this.chooseRandomSession();
    await this.randomSession.runSession();
  }
}

export default Session;
