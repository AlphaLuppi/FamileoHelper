import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { padsRoutes } from "../src/routes/pads.js";
import { MockFamileoClient } from "../src/famileo/MockFamileoClient.js";
import type { AuthVars } from "../src/auth/jwt.js";

function makeApp() {
  const app = new Hono<{ Variables: AuthVars }>();
  app.use("*", async (c, next) => {
    c.set("userId", 1);
    c.set("userEmail", "test@test");
    await next();
  });
  app.route("/", padsRoutes(new MockFamileoClient()));
  return app;
}

describe("GET /pads", () => {
  it("returns pads from the famileo client", async () => {
    const res = await makeApp().request("/pads");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { pads: Array<{ id: string; name: string }> };
    expect(body.pads.length).toBeGreaterThan(0);
    expect(body.pads[0]!.id).toBe("pad_grandparents");
  });
});
