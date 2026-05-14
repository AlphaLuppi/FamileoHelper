import { Hono } from "hono";
import { z } from "zod";
import type { InviteCodesRepo } from "../auth/inviteCodesRepo.js";

const generateSchema = z
  .object({
    expiresInDays: z.number().int().min(1).max(365).optional(),
  })
  .optional();

export function adminRoutes(invites: InviteCodesRepo) {
  const app = new Hono();

  app.post("/admin/invite", async (c) => {
    let body: unknown = {};
    try {
      body = await c.req.json();
    } catch {
      // empty body is ok
    }
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "invalid body" }, 400);
    const days = parsed.data?.expiresInDays;
    const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : undefined;
    const row = invites.generate(expiresAt);
    return c.json({ code: row.code, expiresAt: row.expires_at });
  });

  return app;
}
