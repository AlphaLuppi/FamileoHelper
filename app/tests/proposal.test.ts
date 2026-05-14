import { describe, it, expect } from "vitest";
import { buildProposals } from "../src/domain/proposal";
import type { Photo } from "../src/domain/types";

function p(id: string, isoDate: string, w = 1000, h = 1000): Photo {
  return { id, uri: `file://${id}`, createdAt: isoDate, width: w, height: h };
}

describe("buildProposals", () => {
  it("returns one proposal per cluster", () => {
    expect(buildProposals([
      p("a", "2026-05-10T10:00:00Z"),
      p("b", "2026-05-10T10:30:00Z"),
      p("c", "2026-05-11T15:00:00Z"),
    ])).toHaveLength(2);
  });
  it("each proposal has date and weekday in French", () => {
    const r = buildProposals([p("a", "2026-05-10T10:00:00Z")]);
    expect(r[0]!.date).toBe("2026-05-10");
    expect(r[0]!.weekday).toBe("dimanche");
  });
  it("each proposal has a stable momentHash", () => {
    const photos = [p("a", "2026-05-10T10:00:00Z")];
    expect(buildProposals(photos)[0]!.momentHash).toBe(buildProposals(photos)[0]!.momentHash);
  });
  it("returns empty array for no photos", () => {
    expect(buildProposals([])).toEqual([]);
  });
});
