import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildApp, buildServices } from "../src/server.js";
import type { Config } from "../src/config.js";

function makeCfg(): Config {
  return {
    port: 0,
    bearerToken: "secret-token-1234567890",
    jwtSecret: "x".repeat(32),
    logLevel: "error",
    dataDir: mkdtempSync(path.join(tmpdir(), "fh-smoke-")),
    sessionEncryptionKey: Buffer.alloc(32, 0),
    useMockFamileo: true,
  };
}

describe("smoke (multi-user)", () => {
  const cfg = makeCfg();
  const services = buildServices(cfg);
  const app = buildApp(cfg, services);

  let inviteCode = "";
  let jwt = "";

  beforeAll(async () => {
    // 1. Admin generates an invite code (bearer-protected).
    const inv = await app.request("/admin/invite", {
      method: "POST",
      headers: {
        authorization: `Bearer ${cfg.bearerToken}`,
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect(inv.status).toBe(200);
    inviteCode = ((await inv.json()) as { code: string }).code;
  });

  it("rejects unauth /pads", async () => {
    const res = await app.request("/pads");
    expect(res.status).toBe(401);
  });

  it("/health does not require auth", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("rejects /pads with stale bearer (no JWT)", async () => {
    const res = await app.request("/pads", {
      headers: { authorization: `Bearer ${cfg.bearerToken}` },
    });
    expect(res.status).toBe(401);
  });

  it("end-to-end : register → login → /pads → /post", async () => {
    // Register
    const reg = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.test",
        password: "supersecret",
        inviteCode,
      }),
    });
    expect(reg.status).toBe(200);
    const regBody = (await reg.json()) as { token: string };
    expect(regBody.token).toBeTruthy();

    // Login with the same creds
    const log = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "alice@example.test",
        password: "supersecret",
      }),
    });
    expect(log.status).toBe(200);
    jwt = ((await log.json()) as { token: string }).token;

    const auth = { authorization: `Bearer ${jwt}` };

    // /pads works under JWT (mock client)
    const padsRes = await app.request("/pads", { headers: auth });
    expect(padsRes.status).toBe(200);
    const padsBody = (await padsRes.json()) as { pads: Array<{ id: string }> };
    const padId = padsBody.pads[0]!.id;

    // /gazette-deadline
    const gazRes = await app.request(`/gazette-deadline?padId=${padId}`, { headers: auth });
    expect(gazRes.status).toBe(200);

    // /post
    const fd = new FormData();
    fd.append("padId", padId);
    fd.append("text", "smoke");
    fd.append("photos", new Blob([new Uint8Array([1, 2])], { type: "image/jpeg" }), "x.jpg");
    const postRes = await app.request("/post", { method: "POST", headers: auth, body: fd });
    expect(postRes.status).toBe(200);
  });

  it("invite code is single-use", async () => {
    const reg = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "bob@example.test",
        password: "supersecret",
        inviteCode,
      }),
    });
    expect(reg.status).toBe(400);
  });

  it("/famileo/session paste round-trips per user", async () => {
    const auth = { authorization: `Bearer ${jwt}`, "content-type": "application/json" };
    const post = await app.request("/famileo/session", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ cookies: "PHPSESSID=abc; REMEMBERME=def" }),
    });
    expect(post.status).toBe(200);
    const get = await app.request("/famileo/session", { headers: { authorization: `Bearer ${jwt}` } });
    expect(get.status).toBe(200);
    expect(((await get.json()) as { present: boolean }).present).toBe(true);
  });
});
