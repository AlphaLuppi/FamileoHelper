import { describe, it, expect } from "vitest";
import { buildApp, buildServices } from "../src/server.js";
import type { Config } from "../src/config.js";

const cfg: Config = {
  port: 0,
  bearerToken: "secret-token-1234567890",
  logLevel: "error",
  dataDir: ":memory:",
  sessionEncryptionKey: Buffer.alloc(32, 0),
  useMockFamileo: true,
};

function authHeaders() {
  return { authorization: `Bearer ${cfg.bearerToken}` };
}

describe("smoke", () => {
  const app = buildApp(cfg, buildServices(cfg));

  it("rejects unauth /pads", async () => {
    const res = await app.request("/pads");
    expect(res.status).toBe(401);
  });

  it("/health does not require auth", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("end-to-end : pads → gazette → post", async () => {
    const padsRes = await app.request("/pads", { headers: authHeaders() });
    expect(padsRes.status).toBe(200);
    const padsBody = (await padsRes.json()) as { pads: Array<{ id: string }> };
    const padId = padsBody.pads[0]!.id;

    const gazRes = await app.request(`/gazette-deadline?padId=${padId}`, { headers: authHeaders() });
    expect(gazRes.status).toBe(200);

    const fd = new FormData();
    fd.append("padId", padId);
    fd.append("text", "smoke");
    fd.append("photos", new Blob([new Uint8Array([1, 2])], { type: "image/jpeg" }), "x.jpg");
    const postRes = await app.request("/post", {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    expect(postRes.status).toBe(200);
  });
});
