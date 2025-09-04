import { getAccountsDb } from "../db/db_crm";

export const generateSession = (durationHours = 12, account_id: number) => {
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];

  // session object (parent = accounts row)
  const session = {
    account_id,
    date: currentDate,
    target_sessions: Math.floor(Math.random() * 3) + 3, // 3–5
    sessions_completed: 0,
    total_videos_scraped: 0,
  };

  const db = getAccountsDb();

  // insert session row
  db.run(
    `INSERT INTO worklog 
       (account_id, date, target_sessions, sessions_completed, total_videos_scraped) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      session.account_id,
      session.date,
      session.target_sessions,
      session.sessions_completed,
      session.total_videos_scraped,
    ],
    function (err) {
      if (err) return console.error("Insert failed:", err);

      if (this.changes === 0) {
        // row wasn’t inserted (already exists)
        console.log("Worklog already exists for this account/date");
        return;
      }

      const worklogId = this.lastID; // ✅ parent session id

      // generate times for today_sessions
      const startTime = now.getTime();
      const endTime = startTime + durationHours * 60 * 60 * 1000;

      const times: number[] = [];
      for (let i = 0; i < session.target_sessions; i++) {
        const rand = Math.random();
        const ts = startTime + rand * (endTime - startTime);
        times.push(ts);
      }
      times.sort((a, b) => a - b);

      // helper to format HH:MM
      const formatTime = (ts: number) =>
        new Date(ts).toLocaleTimeString("hr-HR", {
          hour: "2-digit",
          minute: "2-digit",
        });

      // insert today_sessions rows (parent = session row)
      for (const t of times) {
        const start_session_time = formatTime(t);
        const videos_scraped = 0;
        const videos_skipped = 0;

        db.run(
          `INSERT INTO today_sessions 
             (worklog_id, start_session_time, videos_scraped, videos_skipped) 
           VALUES (?, ?, ?, ?)`,
          [worklogId, start_session_time, videos_scraped, videos_skipped]
        );
      }
    }
  );

  return { session };
};
