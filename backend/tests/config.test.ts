import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("parses required env vars", () => {
    const cfg = loadConfig({
      PORT: "9000",
      BACKEND_BEARER_TOKEN: "tok-tok-tok-tok-tok",
      SESSION_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
      DATA_DIR: "/tmp/data",
      LOG_LEVEL: "debug",
      USE_MOCK_FAMILEO: "true",
    });
    expect(cfg.port).toBe(9000);
    expect(cfg.bearerToken).toBe("tok-tok-tok-tok-tok");
    expect(cfg.useMockFamileo).toBe(true);
  });

  it("throws if bearer token missing", () => {
    expect(() => loadConfig({})).toThrow();
  });
});
