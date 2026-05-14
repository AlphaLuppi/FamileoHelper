import { sign, verify } from "hono/jwt";
import type { MiddlewareHandler } from "hono";

const EXPIRES_SECONDS = 7 * 24 * 60 * 60;

export type JwtPayload = {
  sub: string; // userId as string
  email: string;
  iat: number;
  exp: number;
};

export async function issueToken(
  userId: number,
  email: string,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: String(userId),
    email,
    iat: now,
    exp: now + EXPIRES_SECONDS,
  };
  return sign(payload, secret);
}

export type AuthVars = {
  userId: number;
  userEmail: string;
};

export function jwtAuth(secret: string): MiddlewareHandler<{ Variables: AuthVars }> {
  return async (c, next) => {
    const header = c.req.header("authorization") ?? "";
    const m = /^Bearer (.+)$/.exec(header);
    if (!m) return c.json({ error: "unauthorized" }, 401);
    const token = m[1]!;
    let payload: JwtPayload;
    try {
      payload = (await verify(token, secret, "HS256")) as JwtPayload;
    } catch {
      return c.json({ error: "unauthorized" }, 401);
    }
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      return c.json({ error: "unauthorized" }, 401);
    }
    c.set("userId", userId);
    c.set("userEmail", payload.email);
    await next();
  };
}
