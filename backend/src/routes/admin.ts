import { Hono } from "hono";
import type { SessionStore } from "../famileo/sessionStore.js";

type Body = {
  cookies?: string;
  cookieHeader?: string;
};

export function adminRoutes(sessions: SessionStore) {
  const app = new Hono();

  app.post("/admin/famileo-session", async (c) => {
    let body: Body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    const raw = (body.cookies ?? body.cookieHeader ?? "").trim();
    if (!raw) return c.json({ error: "cookies required" }, 400);
    if (!/PHPSESSID/i.test(raw)) {
      return c.json({ error: "PHPSESSID missing in cookies" }, 400);
    }
    sessions.save({ cookies: raw });
    return c.json({ ok: true });
  });

  app.get("/admin/famileo-session", (c) => {
    const s = sessions.load();
    return c.json({ present: !!s });
  });

  return app;
}
