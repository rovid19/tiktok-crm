import { Request, Response } from "express";
import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { open } from "sqlite";
import { spawn } from "child_process";

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BASE_PROFILE_DIR = path.join(PROJECT_ROOT, "profiles");
const DB_FILE = path.join(PROJECT_ROOT, "crm.db");

// helper to open db
async function getDb() {
  return open({ filename: DB_FILE, driver: sqlite3.Database });
}

// ---------- CONTROLLERS ----------

export const fetchAccounts = async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      "SELECT id, email, password, chrome_profile_path, proxy, status, created_at, last_run, cookies FROM accounts"
    );
    await db.close();

    res.json(rows);
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

    await db.run(
      `INSERT INTO accounts (id, email, password, chrome_profile_path, proxy, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'idle', ?)`,
      [newId, email, password, profilePath, proxy, currentTime]
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
      "SELECT chrome_profile_path, proxy FROM accounts WHERE id = ?",
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

    const cmd = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      `--user-data-dir=${profilePath}`,
      "--profile-directory=Default",
      "--remote-debugging-port=9222",
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
