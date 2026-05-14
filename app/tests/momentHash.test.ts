import { describe, it, expect } from "vitest";
import { momentHash } from "../src/domain/momentHash";

describe("momentHash", () => {
  it("is stable regardless of input order", () => {
    expect(momentHash(["a", "b", "c"])).toBe(momentHash(["c", "a", "b"]));
  });
  it("differs when photos differ", () => {
    expect(momentHash(["a", "b"])).not.toBe(momentHash(["a", "c"]));
  });
  it("is deterministic across calls", () => {
    expect(momentHash(["a"])).toBe(momentHash(["a"]));
  });
});
