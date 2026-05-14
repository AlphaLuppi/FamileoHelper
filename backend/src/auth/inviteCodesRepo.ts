import { randomBytes } from "node:crypto";
import type { Db } from "../db/sqlite.js";

export type InviteCodeRow = {
  code: string;
  created_at: string;
  expires_at: string | null;
  used_by: number | null;
  used_at: string | null;
};

export class InviteCodesRepo {
  constructor(private db: Db) {}

  generate(expiresAt?: Date): InviteCodeRow {
    const code = randomBytes(9).toString("base64url").toUpperCase();
    const now = new Date().toISOString();
    const expires = expiresAt?.toISOString() ?? null;
    this.db
      .prepare(`INSERT INTO invite_codes (code, created_at, expires_at) VALUES (?, ?, ?)`)
      .run(code, now, expires);
    return { code, created_at: now, expires_at: expires, used_by: null, used_at: null };
  }

  find(code: string): InviteCodeRow | null {
    const row = this.db
      .prepare(
        `SELECT code, created_at, expires_at, used_by, used_at FROM invite_codes WHERE code = ?`,
      )
      .get(code.trim().toUpperCase()) as InviteCodeRow | undefined;
    return row ?? null;
  }

  /**
   * Atomically consume a code. Returns true on success, false if already used,
   * expired, or unknown.
   */
  consume(code: string, userId: number): boolean {
    const now = new Date().toISOString();
    const info = this.db
      .prepare(
        `UPDATE invite_codes
         SET used_by = ?, used_at = ?
         WHERE code = ?
           AND used_by IS NULL
           AND (expires_at IS NULL OR expires_at > ?)`,
      )
      .run(userId, now, code.trim().toUpperCase(), now);
    return info.changes === 1;
  }
}
