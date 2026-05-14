import { getDb } from "./db";

const LAST_POST_AT = "last_post_at";

export async function getLastPostAt(defaultIso: string): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_state WHERE key = ?",
    LAST_POST_AT,
  );
  return row?.value ?? defaultIso;
}

export async function setLastPostAt(iso: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    LAST_POST_AT,
    iso,
  );
}
