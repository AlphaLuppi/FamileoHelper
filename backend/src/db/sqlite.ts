import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export function openDb(dataDir: string) {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "backend.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS famileo_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ciphertext BLOB NOT NULL,
      iv BLOB NOT NULL,
      tag BLOB NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS famileo_sessions (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      ciphertext BLOB NOT NULL,
      iv BLOB NOT NULL,
      tag BLOB NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export type Db = ReturnType<typeof openDb>;
