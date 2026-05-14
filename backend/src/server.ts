import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { Config } from "./config.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { healthRoutes } from "./routes/health.js";
import { captionRoutes } from "./routes/caption.js";
import { bearerAuth } from "./auth/bearerAuth.js";
import { CaptionService } from "./llm/CaptionService.js";
import { ClaudeAgentSdkClient, type ClaudeClient } from "./llm/claudeClient.js";

export type Services = {
  caption: CaptionService;
};

export function buildServices(cfg: Config): Services {
  const claude: ClaudeClient = cfg.claudeOauthToken
    ? new ClaudeAgentSdkClient({ oauthToken: cfg.claudeOauthToken })
    : { prompt: async () => "" };
  return {
    caption: new CaptionService(claude),
  };
}

export function buildApp(cfg: Config, services?: Services) {
  const svc = services ?? buildServices(cfg);
  const app = new Hono();
  app.route("/", healthRoutes());

  const protectedApp = new Hono();
  protectedApp.use("*", bearerAuth(cfg.bearerToken));
  protectedApp.route("/", captionRoutes(svc.caption));
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
