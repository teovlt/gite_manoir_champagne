import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";
import { hashPassword } from "./auth.js";

fs.mkdirSync(path.join(config.dataDir, "uploads"), { recursive: true });

export const db = new DatabaseSync(path.join(config.dataDir, "manoir.sqlite"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS content (
    page TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (page, key)
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY,
    key TEXT UNIQUE,
    section TEXT NOT NULL,
    alt TEXT NOT NULL DEFAULT '',
    url TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    arrival TEXT,
    departure TEXT,
    dates TEXT,
    adults INTEGER,
    children INTEGER,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'nouvelle',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const readShared = (file) => JSON.parse(fs.readFileSync(path.join(config.sharedDir, file), "utf8"));
export const contentSchema = readShared("content.json");

export const getSetting = (key, fallback) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? JSON.parse(row.value) : fallback;
};
export const setSetting = (key, value) =>
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, JSON.stringify(value));

export const logActivity = (userName, message) => db.prepare("INSERT INTO activity (user_name, message) VALUES (?, ?)").run(userName, message);

/** Idempotent seeding: adds whatever is missing, never overwrites owners' edits. */
export async function seed() {
  const insertPhoto = db.prepare("INSERT OR IGNORE INTO photos (key, section, alt, url, sort) VALUES (?, ?, ?, ?, ?)");
  readShared("photos.json").forEach((p, i) => insertPhoto.run(p.key, p.section, p.alt, p.url, i));

  if (!db.prepare("SELECT 1 FROM settings WHERE key = 'pricing'").get()) setSetting("pricing", readShared("pricing.json"));
  if (!db.prepare("SELECT 1 FROM settings WHERE key = 'navLinks'").get()) setSetting("navLinks", contentSchema.navLinks);
  if (!db.prepare("SELECT 1 FROM settings WHERE key = 'bannerEnabled'").get()) setSetting("bannerEnabled", true);

  const { email, password, name } = config.admin;
  const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (userCount === 0) {
    if (email && password) {
      db.prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)").run(email, name, await hashPassword(password));
      console.log(`[seed] admin account created for ${email}`);
    } else {
      console.warn("[seed] no admin account: set ADMIN_EMAIL and ADMIN_PASSWORD, or run `pnpm create-user`.");
    }
  }
}
