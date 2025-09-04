import SessionHelpers from "./SessionHelpers.ts";

class SessionFYP {
  sessionHelpers: SessionHelpers;
  page: any;

  constructor(sessionHelpers: SessionHelpers, page: any) {
    this.sessionHelpers = sessionHelpers;
    this.page = page;
  }

  async runSession() {
    const scrollTimes = Math.floor(Math.random() * (8 - 2 + 1)) + 2;
    await this.sessionHelpers.scroll(this.page, scrollTimes);
    return false; // Don't scroll more on FYP
  }
}
export default SessionFYP;
