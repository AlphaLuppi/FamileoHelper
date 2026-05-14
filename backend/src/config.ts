import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  BACKEND_BEARER_TOKEN: z.string().min(16, "must be at least 16 chars"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  DATA_DIR: z.string().default("./data"),
  SESSION_ENCRYPTION_KEY: z
    .string()
    .refine((s) => Buffer.from(s, "base64").length === 32, "must decode to 32 bytes"),
  FAMILEO_USERNAME: z.string().optional(),
  FAMILEO_PASSWORD: z.string().optional(),
  CLAUDE_OAUTH_TOKEN: z.string().optional(),
  USE_MOCK_FAMILEO: z
    .union([z.literal("true"), z.literal("false")])
    .default("true")
    .transform((v) => v === "true"),
  WEB_PUBLIC_DIR: z.string().default("./public"),
});

export type Config = {
  port: number;
  bearerToken: string;
  logLevel: "trace" | "debug" | "info" | "warn" | "error";
  dataDir: string;
  sessionEncryptionKey: Buffer;
  famileoUsername?: string;
  famileoPassword?: string;
  claudeOauthToken?: string;
  useMockFamileo: boolean;
  webPublicDir?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Config {
  const parsed = schema.parse(env);
  return {
    port: parsed.PORT,
    bearerToken: parsed.BACKEND_BEARER_TOKEN,
    logLevel: parsed.LOG_LEVEL,
    dataDir: parsed.DATA_DIR,
    sessionEncryptionKey: Buffer.from(parsed.SESSION_ENCRYPTION_KEY, "base64"),
    famileoUsername: parsed.FAMILEO_USERNAME,
    famileoPassword: parsed.FAMILEO_PASSWORD,
    claudeOauthToken: parsed.CLAUDE_OAUTH_TOKEN,
    useMockFamileo: parsed.USE_MOCK_FAMILEO,
    webPublicDir: parsed.WEB_PUBLIC_DIR,
  };
}
