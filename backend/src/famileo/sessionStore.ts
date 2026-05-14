import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Db } from "../db/sqlite.js";

export type SessionData = {
  cookies: string;
};

export class SessionStore {
  constructor(private db: Db, private key: Buffer) {
    if (key.length !== 32) throw new Error("encryption key must be 32 bytes");
  }

  save(userId: number, data: SessionData): void {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(data), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const stmt = this.db.prepare(`
      INSERT INTO famileo_sessions (user_id, ciphertext, iv, tag, updated_at)
      VALUES (@user_id, @ciphertext, @iv, @tag, @updated_at)
      ON CONFLICT(user_id) DO UPDATE SET
        ciphertext = excluded.ciphertext,
        iv = excluded.iv,
        tag = excluded.tag,
        updated_at = excluded.updated_at
    `);
    stmt.run({
      user_id: userId,
      ciphertext,
      iv,
      tag,
      updated_at: new Date().toISOString(),
    });
  }

  load(userId: number): SessionData | null {
    const row = this.db
      .prepare(
        "SELECT ciphertext, iv, tag FROM famileo_sessions WHERE user_id = ?",
      )
      .get(userId) as { ciphertext: Buffer; iv: Buffer; tag: Buffer } | undefined;
    if (!row) return null;
    const decipher = createDecipheriv("aes-256-gcm", this.key, row.iv);
    decipher.setAuthTag(row.tag);
    const plaintext = Buffer.concat([decipher.update(row.ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as SessionData;
  }

  clear(userId: number): void {
    this.db.prepare("DELETE FROM famileo_sessions WHERE user_id = ?").run(userId);
  }
}
