import { describe, it, expect } from "vitest";
import { clusterMoments } from "../src/domain/clustering";
import type { Photo } from "../src/domain/types";

function p(id: string, isoDate: string, loc?: [number, number]): Photo {
  return {
    id,
    uri: `file://${id}`,
    createdAt: isoDate,
    width: 100,
    height: 100,
    location: loc ? { latitude: loc[0], longitude: loc[1] } : undefined,
  };
}

describe("clusterMoments", () => {
  it("groups photos within 4 hours and 500m as one moment", () => {
    const photos = [
      p("a", "2026-05-10T14:00:00Z", [45.75, 4.85]),
      p("b", "2026-05-10T14:30:00Z", [45.751, 4.851]),
      p("c", "2026-05-10T15:00:00Z", [45.752, 4.852]),
    ];
    const moments = clusterMoments(photos);
    expect(moments).toHaveLength(1);
    expect(moments[0]!.photos).toHaveLength(3);
  });
  it("splits photos > 4 hours apart into two moments", () => {
    const photos = [p("a", "2026-05-10T10:00:00Z"), p("b", "2026-05-10T18:00:00Z")];
    expect(clusterMoments(photos)).toHaveLength(2);
  });
  it("splits photos > 500m apart into two moments even if simultaneous", () => {
    const photos = [
      p("a", "2026-05-10T14:00:00Z", [45.75, 4.85]),
      p("b", "2026-05-10T14:10:00Z", [45.80, 4.85]),
    ];
    expect(clusterMoments(photos)).toHaveLength(2);
  });
  it("clusters by time alone when no GPS available", () => {
    expect(clusterMoments([
      p("a", "2026-05-10T14:00:00Z"),
      p("b", "2026-05-10T14:30:00Z"),
    ])).toHaveLength(1);
  });
  it("returns empty array for empty input", () => {
    expect(clusterMoments([])).toEqual([]);
  });
});
