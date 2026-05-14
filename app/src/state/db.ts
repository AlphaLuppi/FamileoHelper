import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync("familieohelper.db").then(migrate);
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS moment_decisions (
      moment_hash TEXT PRIMARY KEY,
      decision TEXT,
      decided_at TEXT
    );
    CREATE TABLE IF NOT EXISTS pads_cache (
      pad_id TEXT PRIMARY KEY,
      name TEXT,
      last_used_at TEXT
    );
  `);
  return db;
}
