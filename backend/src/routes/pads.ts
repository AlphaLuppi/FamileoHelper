import { Hono } from "hono";
import type { FamileoClient } from "../famileo/FamileoClient.js";

export function padsRoutes(famileo: FamileoClient) {
  const app = new Hono();
  app.get("/pads", async (c) => {
    await famileo.ensureSession();
    const pads = await famileo.listPads();
    return c.json({ pads });
  });
  return app;
}
