import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { Config } from "./config.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { healthRoutes } from "./routes/health.js";
import { bearerAuth } from "./auth/bearerAuth.js";

export function buildApp(cfg: Config) {
  const app = new Hono();
  app.route("/", healthRoutes());

  // protected sub-app for everything else (later tasks will mount routes here)
  const protectedApp = new Hono();
  protectedApp.use("*", bearerAuth(cfg.bearerToken));
  app.route("/", protectedApp);

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
