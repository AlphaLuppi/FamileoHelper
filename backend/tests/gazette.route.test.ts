import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { gazetteRoutes } from "../src/routes/gazette.js";
import { MockFamileoClient } from "../src/famileo/MockFamileoClient.js";

function makeApp() {
  const app = new Hono();
  app.route("/", gazetteRoutes(new MockFamileoClient()));
  return app;
}

describe("GET /gazette-deadline", () => {
  it("returns next closing date for a pad", async () => {
    const res = await makeApp().request("/gazette-deadline?padId=pad_grandparents");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { padId: string; closesAt: string };
    expect(body.padId).toBe("pad_grandparents");
    expect(new Date(body.closesAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("400 when padId missing", async () => {
    const res = await makeApp().request("/gazette-deadline");
    expect(res.status).toBe(400);
  });

  it("404 for unknown pad", async () => {
    const res = await makeApp().request("/gazette-deadline?padId=nope");
    expect(res.status).toBe(404);
  });
});
