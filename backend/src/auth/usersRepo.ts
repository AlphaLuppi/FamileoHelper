import type { Db } from "../db/sqlite.js";

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
};

export class UsersRepo {
  constructor(private db: Db) {}

  create(email: string, passwordHash: string): UserRow {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      `INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)`,
    );
    const info = stmt.run(email.trim().toLowerCase(), passwordHash, now);
    return {
      id: Number(info.lastInsertRowid),
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      created_at: now,
    };
  }

  findByEmail(email: string): UserRow | null {
    const row = this.db
      .prepare(`SELECT id, email, password_hash, created_at FROM users WHERE email = ?`)
      .get(email.trim().toLowerCase()) as UserRow | undefined;
    return row ?? null;
  }

  findById(id: number): UserRow | null {
    const row = this.db
      .prepare(`SELECT id, email, password_hash, created_at FROM users WHERE id = ?`)
      .get(id) as UserRow | undefined;
    return row ?? null;
  }
}
