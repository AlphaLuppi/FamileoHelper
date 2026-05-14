import { Hono } from "hono";
import { z } from "zod";
import type { CaptionService } from "../llm/CaptionService.js";

const generateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city: z.string().optional(),
  photoCount: z.number().int().min(1).max(20),
  weekday: z.string().min(1),
});

const reformulateSchema = z.object({
  transcribed: z.string().min(1),
});

export function captionRoutes(svc: CaptionService) {
  const app = new Hono();

  app.post("/caption", async (c) => {
    const mode = c.req.query("mode");
    const json = await c.req.json().catch(() => null);
    if (!json || typeof json !== "object") return c.json({ error: "invalid body" }, 400);

    if (mode === "reformulate") {
      const parsed = reformulateSchema.safeParse(json);
      if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
      const caption = await svc.reformulate(parsed.data.transcribed);
      return c.json({ caption });
    }

    const parsed = generateSchema.safeParse(json);
    if (!parsed.success) return c.json({ error: parsed.error.message }, 400);
    const caption = await svc.generate(parsed.data);
    return c.json({ caption });
  });

  return app;
}
