import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDb } from "../src/db/sqlite.js";
import { SessionStore } from "../src/famileo/sessionStore.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "fh-test-"));
});

describe("SessionStore", () => {
  it("round-trips an encrypted session", () => {
    const db = openDb(dir);
    const key = Buffer.alloc(32, 7);
    const store = new SessionStore(db, key);
    store.save({ cookies: "session=abc123" });
    const got = store.load();
    expect(got?.cookies).toBe("session=abc123");
  });

  it("returns null when empty", () => {
    const db = openDb(dir);
    const key = Buffer.alloc(32, 1);
    const store = new SessionStore(db, key);
    expect(store.load()).toBeNull();
  });

  it("fails to decrypt with wrong key", () => {
    const db = openDb(dir);
    const store1 = new SessionStore(db, Buffer.alloc(32, 1));
    store1.save({ cookies: "x" });
    const store2 = new SessionStore(db, Buffer.alloc(32, 2));
    expect(() => store2.load()).toThrow();
  });
});
