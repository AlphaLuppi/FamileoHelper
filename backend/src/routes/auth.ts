import { Hono } from "hono";
import { z } from "zod";
import type { UsersRepo } from "../auth/usersRepo.js";
import type { InviteCodesRepo } from "../auth/inviteCodesRepo.js";
import type { SessionStore } from "../famileo/sessionStore.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { issueToken, jwtAuth, type AuthVars } from "../auth/jwt.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  inviteCode: z.string().min(4).max(64),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export type AuthDeps = {
  users: UsersRepo;
  invites: InviteCodesRepo;
  sessions: SessionStore;
  jwtSecret: string;
};

export function authRoutes(deps: AuthDeps) {
  const app = new Hono<{ Variables: AuthVars }>();

  app.post("/auth/register", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "invalid body" }, 400);
    }
    const { email, password, inviteCode } = parsed.data;

    const invite = deps.invites.find(inviteCode);
    if (!invite) return c.json({ error: "invite code invalid" }, 400);
    if (invite.used_by !== null) return c.json({ error: "invite code already used" }, 400);
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return c.json({ error: "invite code expired" }, 400);
    }

    if (deps.users.findByEmail(email)) {
      return c.json({ error: "email already registered" }, 409);
    }

    const hash = await hashPassword(password);
    const user = deps.users.create(email, hash);
    const consumed = deps.invites.consume(inviteCode, user.id);
    if (!consumed) {
      // Race: someone consumed the code between find() and consume().
      return c.json({ error: "invite code invalid" }, 400);
    }

    const token = await issueToken(user.id, user.email, deps.jwtSecret);
    return c.json({ token, user: { id: user.id, email: user.email } });
  });

  app.post("/auth/login", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "invalid body" }, 400);
    const { email, password } = parsed.data;

    const user = deps.users.findByEmail(email);
    if (!user) return c.json({ error: "invalid credentials" }, 401);
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return c.json({ error: "invalid credentials" }, 401);

    const token = await issueToken(user.id, user.email, deps.jwtSecret);
    return c.json({ token, user: { id: user.id, email: user.email } });
  });

  app.get("/auth/me", jwtAuth(deps.jwtSecret), async (c) => {
    const userId = c.get("userId");
    const email = c.get("userEmail");
    const hasFamileoSession = !!deps.sessions.load(userId);
    return c.json({ user: { id: userId, email }, hasFamileoSession });
  });

  return app;
}
