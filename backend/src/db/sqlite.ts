import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export function openDb(dataDir: string) {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "backend.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS famileo_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ciphertext BLOB NOT NULL,
      iv BLOB NOT NULL,
      tag BLOB NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export type Db = ReturnType<typeof openDb>;
