import { getDb } from "./db";
import type { Pad } from "../domain/types";

export async function upsertPads(pads: Pick<Pad, "id" | "name">[]): Promise<void> {
  const db = await getDb();
  for (const p of pads) {
    await db.runAsync(
      `INSERT INTO pads_cache (pad_id, name) VALUES (?, ?)
       ON CONFLICT(pad_id) DO UPDATE SET name = excluded.name`,
      p.id,
      p.name,
    );
  }
}

export async function listCachedPads(): Promise<Pad[]> {
  const db = await getDb();
  return db.getAllAsync<Pad>(
    "SELECT pad_id as id, name, last_used_at as lastUsedAt FROM pads_cache ORDER BY last_used_at DESC NULLS LAST, name ASC",
  );
}

export async function markPadUsed(padId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE pads_cache SET last_used_at = ? WHERE pad_id = ?",
    new Date().toISOString(),
    padId,
  );
}

export async function getDefaultPadId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ pad_id: string }>(
    "SELECT pad_id FROM pads_cache ORDER BY last_used_at DESC NULLS LAST, pad_id ASC LIMIT 1",
  );
  return row?.pad_id ?? null;
}
