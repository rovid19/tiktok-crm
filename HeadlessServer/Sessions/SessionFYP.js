class SessionFYP {
  sessionHelpers;
  page;
  constructor(sessionHelpers, page) {
    this.sessionHelpers = sessionHelpers;
    this.page = page;
  }

  async runSession() {
    const scrollTimes = Math.floor(Math.random() * (8 - 2 + 1)) + 2;
    await this.sessionHelpers.scroll(page, scrollTimes);
  }
}
export default SessionFYP;
