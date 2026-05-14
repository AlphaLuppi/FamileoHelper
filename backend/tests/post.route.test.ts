import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { postRoutes } from "../src/routes/post.js";
import { MockFamileoClient } from "../src/famileo/MockFamileoClient.js";
import type { AuthVars } from "../src/auth/jwt.js";

function makeApp() {
  const app = new Hono<{ Variables: AuthVars }>();
  app.use("*", async (c, next) => {
    c.set("userId", 1);
    c.set("userEmail", "t@t");
    await next();
  });
  app.route("/", postRoutes(new MockFamileoClient()));
  return app;
}

function buildFormData(opts: {
  padId?: string;
  text?: string;
  photos: { name: string; data: Uint8Array }[];
}) {
  const fd = new FormData();
  if (opts.padId !== undefined) fd.append("padId", opts.padId);
  if (opts.text !== undefined) fd.append("text", opts.text);
  for (const p of opts.photos) {
    fd.append("photos", new Blob([p.data], { type: "image/jpeg" }), p.name);
  }
  return fd;
}

describe("POST /post", () => {
  it("creates a post and returns the post id", async () => {
    const fd = buildFormData({
      padId: "pad_grandparents",
      text: "hello grandparents",
      photos: [{ name: "a.jpg", data: new Uint8Array([1, 2, 3]) }],
    });
    const res = await makeApp().request("/post", { method: "POST", body: fd });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { postId: string; padId: string };
    expect(body.postId).toMatch(/^post_/);
    expect(body.padId).toBe("pad_grandparents");
  });

  it("400 when padId missing", async () => {
    const fd = buildFormData({ text: "x", photos: [{ name: "a.jpg", data: new Uint8Array([1]) }] });
    const res = await makeApp().request("/post", { method: "POST", body: fd });
    expect(res.status).toBe(400);
  });

  it("400 when no photos", async () => {
    const fd = buildFormData({ padId: "pad_grandparents", text: "x", photos: [] });
    const res = await makeApp().request("/post", { method: "POST", body: fd });
    expect(res.status).toBe(400);
  });

  it("400 when more than 4 photos", async () => {
    const fd = buildFormData({
      padId: "pad_grandparents",
      text: "x",
      photos: Array.from({ length: 5 }, (_, i) => ({
        name: `${i}.jpg`,
        data: new Uint8Array([i]),
      })),
    });
    const res = await makeApp().request("/post", { method: "POST", body: fd });
    expect(res.status).toBe(400);
  });

  it("404 for unknown pad", async () => {
    const fd = buildFormData({
      padId: "nope",
      text: "x",
      photos: [{ name: "a.jpg", data: new Uint8Array([1]) }],
    });
    const res = await makeApp().request("/post", { method: "POST", body: fd });
    expect(res.status).toBe(404);
  });
});
