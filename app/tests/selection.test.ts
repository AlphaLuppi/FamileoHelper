import { describe, it, expect } from "vitest";
import { selectPhotos } from "../src/domain/selection";
import type { Moment, Photo } from "../src/domain/types";

function p(id: string, w = 1000, h = 1000): Photo {
  return {
    id,
    uri: `file://${id}`,
    createdAt: `2026-05-10T14:0${id.charCodeAt(0) % 10}:00Z`,
    width: w,
    height: h,
  };
}
function m(photos: Photo[]): Moment {
  return { photos, startAt: photos[0]!.createdAt, endAt: photos[photos.length - 1]!.createdAt };
}

describe("selectPhotos", () => {
  it("returns up to 4 photos from a moment", () => {
    expect(selectPhotos(m([p("a"), p("b"), p("c"), p("d"), p("e"), p("f")])).length).toBeLessThanOrEqual(4);
  });
  it("returns all photos when there are 4 or fewer", () => {
    expect(selectPhotos(m([p("a"), p("b")]))).toHaveLength(2);
  });
  it("prefers higher-resolution photos when more than 4 available", () => {
    const selected = selectPhotos(m([
      p("low1", 200, 200), p("low2", 200, 200), p("low3", 200, 200),
      p("low4", 200, 200), p("low5", 200, 200), p("hi", 4000, 3000),
    ]));
    expect(selected.map((s) => s.id)).toContain("hi");
  });
});
