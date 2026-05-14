import { Hono } from "hono";
import type { FamileoClient } from "../famileo/FamileoClient.js";
import type { AuthVars } from "../auth/jwt.js";

export function gazetteRoutes(famileo: FamileoClient) {
  const app = new Hono<{ Variables: AuthVars }>();
  app.get("/gazette-deadline", async (c) => {
    const userId = c.get("userId");
    const padId = c.req.query("padId");
    if (!padId) return c.json({ error: "padId required" }, 400);
    await famileo.ensureSession(userId);
    try {
      const gazettes = await famileo.listGazettes(userId, padId);
      const upcoming = gazettes
        .filter((g) => new Date(g.closesAt).getTime() > Date.now())
        .sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());
      if (upcoming.length === 0) return c.json({ error: "no upcoming gazette" }, 404);
      return c.json({ padId, closesAt: upcoming[0]!.closesAt });
    } catch (e) {
      if ((e as Error).message.toLowerCase().includes("unknown pad")) {
        return c.json({ error: "unknown pad" }, 404);
      }
      throw e;
    }
  });
  return app;
}
