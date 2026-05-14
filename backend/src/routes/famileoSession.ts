import { Hono } from "hono";
import type { SessionStore } from "../famileo/sessionStore.js";
import { jwtAuth, type AuthVars } from "../auth/jwt.js";

type Body = {
  cookies?: string;
  cookieHeader?: string;
};

export function famileoSessionRoutes(sessions: SessionStore, jwtSecret: string) {
  const app = new Hono<{ Variables: AuthVars }>();

  app.use("/famileo/session", jwtAuth(jwtSecret));

  app.post("/famileo/session", async (c) => {
    const userId = c.get("userId");
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
    sessions.save(userId, { cookies: raw });
    return c.json({ ok: true });
  });

  app.get("/famileo/session", (c) => {
    const userId = c.get("userId");
    const s = sessions.load(userId);
    return c.json({ present: !!s });
  });

  app.delete("/famileo/session", (c) => {
    const userId = c.get("userId");
    sessions.clear(userId);
    return c.json({ ok: true });
  });

  return app;
}
