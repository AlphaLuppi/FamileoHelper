import { describe, it, expect } from "vitest";
import { getEnv } from "../src/config/env";

describe("getEnv", () => {
  it("returns expo extra fields", () => {
    const env = getEnv({
      backendUrl: "https://api.example.com",
      backendTokenStorageKey: "tok",
    });
    expect(env.backendUrl).toBe("https://api.example.com");
    expect(env.backendTokenStorageKey).toBe("tok");
  });

  it("throws when backendUrl missing", () => {
    expect(() => getEnv({ backendTokenStorageKey: "tok" } as never)).toThrow();
  });
});
