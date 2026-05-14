import { Hono } from "hono";

export function healthRoutes() {
  const app = new Hono();
  app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));
  return app;
}
