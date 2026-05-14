import { describe, it, expect, vi } from "vitest";
import { BackendClient } from "../src/services/backend/BackendClient";

function makeFetch(responses: Array<{ status: number; body: unknown }>) {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[i++]!;
    return new Response(JSON.stringify(r.body), { status: r.status });
  });
}

describe("BackendClient", () => {
  it("lists pads with bearer auth", async () => {
    const fetcher = makeFetch([{ status: 200, body: { pads: [{ id: "p1", name: "P1" }] } }]);
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    const pads = await c.listPads();
    expect(pads).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api/pads",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer tok" }),
      }),
    );
  });

  it("generates a caption", async () => {
    const fetcher = makeFetch([{ status: 200, body: { caption: "yo" } }]);
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    const cap = await c.generateCaption({
      date: "2026-05-10",
      city: "Lyon",
      photoCount: 2,
      weekday: "dimanche",
    });
    expect(cap).toBe("yo");
  });

  it("reformulates", async () => {
    const fetcher = makeFetch([{ status: 200, body: { caption: "polished" } }]);
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    const cap = await c.reformulate("raw");
    expect(cap).toBe("polished");
  });

  it("gets gazette deadline", async () => {
    const fetcher = makeFetch([{ status: 200, body: { padId: "p1", closesAt: "2026-06-01T00:00:00Z" } }]);
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    const d = await c.gazetteDeadline("p1");
    expect(d.closesAt).toBe("2026-06-01T00:00:00Z");
  });

  it("throws on 401", async () => {
    const fetcher = makeFetch([{ status: 401, body: { error: "unauthorized" } }]);
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    await expect(c.listPads()).rejects.toThrow(/unauthorized/i);
  });

  it("creates a post via multipart", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ postId: "post_1", padId: "p1", postedAt: "x" }), { status: 200 }),
    );
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    const res = await c.createPost({
      padId: "p1",
      text: "hi",
      photos: [{ uri: "file://a.jpg", filename: "a.jpg", mimeType: "image/jpeg" }],
    });
    expect(res.postId).toBe("post_1");
    // Only assert method and URL (body shape is RN-specific FormData, not testable in Node)
    expect(fetcher).toHaveBeenCalledWith(
      "https://api/post",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
