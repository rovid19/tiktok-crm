import { Request, Response } from "express";
import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { open } from "sqlite";
import { spawn } from "child_process";
import { generateSession } from "../utils/accountsHelpers";
import { getAccountsDb } from "../db/db_crm";

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BASE_PROFILE_DIR = path.join(PROJECT_ROOT, "profiles");
const DB_FILE = path.join(PROJECT_ROOT, "crm.db");

// helper to open db
async function getDb() {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  await db.exec("PRAGMA foreign_keys = ON"); // ✅ cascade enabled
  return db;
}

// ---------- CONTROLLERS ----------
export const fetchAccounts = async (req: Request, res: Response) => {
  try {
    const db = getAccountsDb();

    // 1. Get all accounts
    const accounts = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT id, email, password, chrome_profile_path, proxy, status, created_at,
                sessions_completed_today, target_sessions, last_session_time, browser_port
         FROM accounts`,
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    // 2. For each account → fetch worklogs
    for (const acc of accounts) {
      acc.worklogs = await new Promise<any[]>((resolve, reject) => {
        db.all(
          `SELECT id, date, target_sessions, sessions_completed, total_videos_scraped
           FROM worklog
           WHERE account_id = ?`,
          [acc.id],
          (err, rows) => (err ? reject(err) : resolve(rows))
        );
      });

      // 3. For each worklog → fetch today_sessions
      for (const wl of acc.worklogs) {
        wl.today_sessions = await new Promise<any[]>((resolve, reject) => {
          db.all(
            `SELECT id, start_session_time, videos_scraped, videos_skipped
             FROM today_sessions
             WHERE worklog_id = ?`,
            [wl.id],
            (err, rows) => (err ? reject(err) : resolve(rows))
          );
        });
      }
    }

    db.close();

    res.json(accounts);
  } catch (e: any) {
    res.status(500).json({ error: "db_error", message: e.message });
  }
};

export const addAccount = async (req: Request, res: Response) => {
  try {
    const { email = "", password = "", proxy = "" } = req.body;
    const db = await getDb();

    const row = await db.get("SELECT MAX(id) as maxId FROM accounts");
    const newId = (row?.maxId || 0) + 1;
    const currentTime = new Date().toISOString();

    const profilePath = path.join(BASE_PROFILE_DIR, String(newId));
    fs.mkdirSync(profilePath, { recursive: true });
    const profilePort = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;

    await db.run(
      `INSERT INTO accounts (id, email, password, chrome_profile_path, proxy, status, created_at, browser_port)
       VALUES (?, ?, ?, ?, ?, 'idle', ?, ?)`,
      [newId, email, password, profilePath, proxy, currentTime, profilePort]
    );

    await db.close();

    res.json({
      status: "ok",
      msg: `Added account ${
        email || "(empty email)"
      } with profile ${profilePath}`,
      profile_path: profilePath,
    });
  } catch (e: any) {
    res.status(500).json({ error: "db_error", message: e.message });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const accountId = Number(req.params.account_id);
    const db = await getDb();

    const row = await db.get(
      "SELECT email, chrome_profile_path FROM accounts WHERE id = ?",
      accountId
    );

    if (!row) {
      await db.close();
      return res.json({ status: "error", msg: "Account not found" });
    }

    await db.run("DELETE FROM accounts WHERE id = ?", accountId);
    await db.close();

    if (row.chrome_profile_path && fs.existsSync(row.chrome_profile_path)) {
      try {
        fs.rmSync(row.chrome_profile_path, { recursive: true, force: true });
        console.log(
          `[INFO] Deleted profile folder: ${row.chrome_profile_path}`
        );
      } catch (err) {
        console.warn(
          `[WARN] Could not delete profile folder ${row.chrome_profile_path}: ${err}`
        );
      }
    }

    res.json({
      status: "ok",
      msg: `Deleted account ${row.email} and profile folder`,
    });
  } catch (e: any) {
    res.status(500).json({ error: "db_error", message: e.message });
  }
};

export const launchProfile = async (req: Request, res: Response) => {
  try {
    console.log("Launching profile for account:", req.params.account_id);
    const accountId = Number(req.params.account_id);
    const db = await getDb();
    const row = await db.get(
      "SELECT chrome_profile_path, browser_port, proxy FROM accounts WHERE id = ?",
      accountId
    );
    await db.close();

    if (!row) {
      return res
        .status(404)
        .json({ error: "not_found", message: "Account not found" });
    }

    const profilePath = row.chrome_profile_path;
    const proxy = row.proxy;
    const browserPort = row.browser_port;

    const cmd = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      `--user-data-dir=${profilePath}`,
      "--profile-directory=Default",
      `--remote-debugging-port=${browserPort}`,
      "https://www.tiktok.com",
    ];

    if (proxy) {
      cmd.splice(1, 0, `--proxy-server=${proxy}`);
    }

    spawn(cmd[0], cmd.slice(1), { detached: true, stdio: "ignore" }).unref();

    res.json({
      status: "ok",
      msg: `Launched Chrome for account ${accountId} and marked as validated`,
    });
  } catch (e: any) {
    res.status(500).json({ error: "launch_error", message: e.message });
  }
};

// Generate today's sessions
export const generateTodaySessions = async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const now = new Date();

    // Get all accounts
    const accounts = await db.all("SELECT id FROM accounts");
    console.log(accounts);

    for (const acc of accounts) {
      generateSession(12, acc.id);
    }

    await db.close();

    res.json({
      status: "ok",
      msg: "Worklog generated for all accounts",
    });
  } catch (e: any) {
    res.status(500).json({ error: "db_error", message: e.message });
  }
};
