import { describe, it, expect } from "vitest";
import { buildApp } from "../src/server.js";

describe("GET /health", () => {
  it("returns ok without auth", async () => {
    const app = buildApp({
      port: 0,
      bearerToken: "secret-token-1234567890",
      logLevel: "error",
      dataDir: ":memory:",
      sessionEncryptionKey: Buffer.alloc(32, 0),
      useMockFamileo: true,
    });
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
