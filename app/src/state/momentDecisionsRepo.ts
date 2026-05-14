import { getDb } from "./db";

export type Decision = "posted" | "rejected";

export async function getDecision(hash: string): Promise<Decision | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ decision: Decision }>(
    "SELECT decision FROM moment_decisions WHERE moment_hash = ?",
    hash,
  );
  return row?.decision ?? null;
}

export async function setDecision(hash: string, decision: Decision): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO moment_decisions (moment_hash, decision, decided_at)
     VALUES (?, ?, ?)
     ON CONFLICT(moment_hash) DO UPDATE SET decision = excluded.decision, decided_at = excluded.decided_at`,
    hash,
    decision,
    new Date().toISOString(),
  );
}
