import type { MiddlewareHandler } from "hono";
import { timingSafeEqual } from "node:crypto";

export function bearerAuth(expected: string): MiddlewareHandler {
  const expectedBuf = Buffer.from(expected);
  return async (c, next) => {
    const header = c.req.header("authorization") ?? "";
    const match = /^Bearer (.+)$/.exec(header);
    if (!match) return c.json({ error: "unauthorized" }, 401);
    const token = match[1];
    if (!token) return c.json({ error: "unauthorized" }, 401);
    const provided = Buffer.from(token);
    if (provided.length !== expectedBuf.length) return c.json({ error: "unauthorized" }, 401);
    if (!timingSafeEqual(provided, expectedBuf)) return c.json({ error: "unauthorized" }, 401);
    await next();
  };
}
