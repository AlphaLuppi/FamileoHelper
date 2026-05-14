import { Hono } from "hono";
import type { FamileoClient } from "../famileo/FamileoClient.js";
import type { AuthVars } from "../auth/jwt.js";

export function padsRoutes(famileo: FamileoClient) {
  const app = new Hono<{ Variables: AuthVars }>();
  app.get("/pads", async (c) => {
    const userId = c.get("userId");
    await famileo.ensureSession(userId);
    const pads = await famileo.listPads(userId);
    return c.json({ pads });
  });
  return app;
}
