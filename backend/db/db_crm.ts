import sqlite3, { Database } from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Resolve DB path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, "../../crm.db");

export function initAccountsDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_FILE, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.run("PRAGMA foreign_keys = ON");

      // Accounts table
      db.run(
        `
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT,
          password TEXT,
          proxy TEXT,
          chrome_profile_path TEXT DEFAULT NULL,
          browser_port TEXT DEFAULT NULL,
          status TEXT DEFAULT 'idle',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          sessions_completed_today INTEGER DEFAULT 0,
          target_sessions INTEGER DEFAULT 0,
          last_session_time TEXT DEFAULT NULL
        )
        `,
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Worklog table
          db.run(
            `
            CREATE TABLE IF NOT EXISTS worklog (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              account_id INTEGER,
              date TEXT,
              target_sessions INTEGER,
              sessions_completed INTEGER,
              total_videos_scraped INTEGER,
              FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
              UNIQUE(account_id, date)
            )
            `,
            (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Today sessions table
              db.run(
                `
                CREATE TABLE IF NOT EXISTS today_sessions (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  worklog_id INTEGER,
                  start_session_time TEXT,
                  videos_scraped INTEGER,
                  videos_skipped INTEGER,
                  has_ran INTEGER DEFAULT 0,
                  FOREIGN KEY(worklog_id) REFERENCES worklog(id) ON DELETE CASCADE
                )
                `,
                (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                }
              );

              // Close DB
              db.close((err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
          );
        }
      );
    });
  });
}

export function getAccountsDb(): Database {
  const db = new sqlite3.Database(DB_FILE);
  db.run("PRAGMA foreign_keys = ON");
  return db;
}
