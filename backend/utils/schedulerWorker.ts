import { getAccountsDb } from "../db/db_crm";
import Session from "../scrapers/Session/Session.ts";

class SchedulerWorker {
  private intervalId: NodeJS.Timer | null = null;

  constructor() {
    this.startWorker();
  }

  private startWorker() {
    console.log("⏳ SchedulerWorker started");
    this.intervalId = setInterval(() => this.checkSessions(), 60 * 100); // every minute
  }

  private async checkSessions() {
    const db = getAccountsDb();
    const currentDate = new Date().toISOString().split("T")[0];

    const now = new Date();
    const currentTime = now.toLocaleTimeString("hr-HR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    db.all(
      `
     SELECT ts.id, ts.start_session_time, ts.videos_scraped, ts.videos_skipped, ts.has_ran,
       w.account_id, w.date,
       a.browser_port
FROM today_sessions ts
JOIN worklog w ON ts.worklog_id = w.id
JOIN accounts a ON w.account_id = a.id
WHERE w.date = ?

      `,
      [currentDate],
      (err, rows) => {
        if (err) {
          console.error("❌ DB query error:", err);
          return;
        }

        console.log(rows);

        rows.forEach(async (row: any) => {
          if (
            this.isWithinOneMinute(row.start_session_time, currentTime) &&
            row.has_ran === 0
          ) {
            console.log(
              `▶️ Running session ${row.id} for account ${row.account_id} at ${currentTime}`
            );
            await new Promise<void>((resolve, reject) => {
              db.run(
                "UPDATE today_sessions SET has_ran = 1 WHERE id = ?",
                [row.id],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
            const session = new Session(row.browser_port, row.account_id);
            session.runSession();
            // TODO: run your actual session logic here
          }
        });
      }
    );

    db.close();
  }

  private isWithinOneMinute(target: string, current: string): boolean {
    const parseTime = (t: string) => {
      const [h, m] = t.split(":").map((x) => parseInt(x, 10));
      return h * 60 + m; // total minutes since midnight
    };

    const t1 = parseTime(target);
    const t2 = parseTime(current);

    return Math.abs(t1 - t2) <= 1;
  }
}

export default SchedulerWorker;
