import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { bearerAuth } from "../src/auth/bearerAuth.js";

function makeApp(token: string) {
  const app = new Hono();
  app.use("*", bearerAuth(token));
  app.get("/x", (c) => c.text("ok"));
  return app;
}

describe("bearerAuth", () => {
  it("401 when no header", async () => {
    const res = await makeApp("secret").request("/x");
    expect(res.status).toBe(401);
  });

  it("401 when wrong token", async () => {
    const res = await makeApp("secret").request("/x", {
      headers: { authorization: "Bearer nope" },
    });
    expect(res.status).toBe(401);
  });

  it("200 when correct token", async () => {
    const res = await makeApp("secret").request("/x", {
      headers: { authorization: "Bearer secret" },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
});
