import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDb } from "../src/db/sqlite.js";
import { SessionStore } from "../src/famileo/sessionStore.js";
import { UsersRepo } from "../src/auth/usersRepo.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "fh-test-"));
});

function newUserId(db: ReturnType<typeof openDb>): number {
  const users = new UsersRepo(db);
  return users.create(`u${Math.random().toString(36).slice(2)}@x.test`, "hash").id;
}

describe("SessionStore", () => {
  it("round-trips an encrypted session per user", () => {
    const db = openDb(dir);
    const store = new SessionStore(db, Buffer.alloc(32, 7));
    const uid = newUserId(db);
    store.save(uid, { cookies: "session=abc123" });
    expect(store.load(uid)?.cookies).toBe("session=abc123");
  });

  it("isolates sessions between users", () => {
    const db = openDb(dir);
    const store = new SessionStore(db, Buffer.alloc(32, 7));
    const a = newUserId(db);
    const b = newUserId(db);
    store.save(a, { cookies: "a=1" });
    store.save(b, { cookies: "b=2" });
    expect(store.load(a)?.cookies).toBe("a=1");
    expect(store.load(b)?.cookies).toBe("b=2");
  });

  it("returns null when empty", () => {
    const db = openDb(dir);
    const store = new SessionStore(db, Buffer.alloc(32, 1));
    const uid = newUserId(db);
    expect(store.load(uid)).toBeNull();
  });

  it("fails to decrypt with wrong key", () => {
    const db = openDb(dir);
    const uid = newUserId(db);
    const store1 = new SessionStore(db, Buffer.alloc(32, 1));
    store1.save(uid, { cookies: "x" });
    const store2 = new SessionStore(db, Buffer.alloc(32, 2));
    expect(() => store2.load(uid)).toThrow();
  });
});
