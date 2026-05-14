import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "./config.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { healthRoutes } from "./routes/health.js";
import { captionRoutes } from "./routes/caption.js";
import { padsRoutes } from "./routes/pads.js";
import { gazetteRoutes } from "./routes/gazette.js";
import { postRoutes } from "./routes/post.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { famileoSessionRoutes } from "./routes/famileoSession.js";
import { bearerAuth } from "./auth/bearerAuth.js";
import { jwtAuth } from "./auth/jwt.js";
import { CaptionService } from "./llm/CaptionService.js";
import { ClaudeAgentSdkClient, type ClaudeClient } from "./llm/claudeClient.js";
import type { FamileoClient } from "./famileo/FamileoClient.js";
import { MockFamileoClient } from "./famileo/MockFamileoClient.js";
import { WebApiFamileoClient } from "./famileo/WebApiFamileoClient.js";
import { SessionStore } from "./famileo/sessionStore.js";
import { UsersRepo } from "./auth/usersRepo.js";
import { InviteCodesRepo } from "./auth/inviteCodesRepo.js";
import { openDb, type Db } from "./db/sqlite.js";

export type Services = {
  caption: CaptionService;
  famileo: FamileoClient;
  sessions: SessionStore;
  users: UsersRepo;
  invites: InviteCodesRepo;
  db: Db;
};

export function buildServices(cfg: Config): Services {
  const claude: ClaudeClient = cfg.claudeOauthToken
    ? new ClaudeAgentSdkClient({ oauthToken: cfg.claudeOauthToken })
    : { prompt: async () => "" };

  const db = openDb(cfg.dataDir);
  const sessions = new SessionStore(db, cfg.sessionEncryptionKey);
  const users = new UsersRepo(db);
  const invites = new InviteCodesRepo(db);
  const famileo: FamileoClient = cfg.useMockFamileo
    ? new MockFamileoClient()
    : new WebApiFamileoClient(sessions);

  return {
    caption: new CaptionService(claude),
    famileo,
    sessions,
    users,
    invites,
    db,
  };
}

export function buildApp(cfg: Config, services?: Services) {
  const svc = services ?? buildServices(cfg);
  const app = new Hono();
  app.route("/", healthRoutes());

  if (cfg.webPublicDir && existsSync(cfg.webPublicDir)) {
    app.use("*", serveStatic({ root: cfg.webPublicDir }));
  }

  // Auth routes (public): /auth/register, /auth/login. /auth/me is JWT-protected inside.
  app.route(
    "/",
    authRoutes({
      users: svc.users,
      invites: svc.invites,
      sessions: svc.sessions,
      jwtSecret: cfg.jwtSecret,
    }),
  );

  // Famileo session paste/get/delete (JWT-protected internally).
  app.route("/", famileoSessionRoutes(svc.sessions, cfg.jwtSecret));

  // Bearer auth for admin (e.g. generating invite codes).
  const bearer = bearerAuth(cfg.bearerToken);
  app.use("/admin/*", bearer);
  app.route("/", adminRoutes(svc.invites));

  // JWT auth for SPA-facing API.
  const jwt = jwtAuth(cfg.jwtSecret);
  for (const p of ["/caption", "/pads", "/post", "/gazette-deadline"]) {
    app.use(p, jwt);
  }
  app.route("/", captionRoutes(svc.caption));
  app.route("/", padsRoutes(svc.famileo));
  app.route("/", gazetteRoutes(svc.famileo));
  app.route("/", postRoutes(svc.famileo));

  if (cfg.webPublicDir) {
    const indexPath = join(cfg.webPublicDir, "index.html");
    if (existsSync(indexPath)) {
      app.get("*", serveStatic({ path: indexPath }));
    }
  }

  return app;
}

export function startServer(cfg: Config) {
  const logger = createLogger(cfg.logLevel);
  const app = buildApp(cfg);
  serve({ fetch: app.fetch, port: cfg.port }, (info) => {
    logger.info({ port: info.port }, "backend listening");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer(loadConfig());
}
