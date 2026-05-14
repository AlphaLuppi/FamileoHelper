# FamileoHelper Backend MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Node.js backend that the mobile app will call: caption generation via Claude OAuth, post creation via Famileo client (mocked initially), pad listing, gazette deadline lookup. Deployable on the user's VPS via Dokploy.

**Architecture:** Single Hono HTTP service in TypeScript, bearer-token auth, two service modules (`CaptionService` calling Claude via `@anthropic-ai/claude-agent-sdk` with OAuth Max, and `FamileoClient` interface with Mock + future Web impls). State persisted in a single SQLite file (sessions, encrypted). Containerized via Dockerfile, deployed by Dokploy from Git.

**Tech Stack:** Node 22, TypeScript 5.5, Hono 4, Vitest, better-sqlite3, @anthropic-ai/claude-agent-sdk, undici (Famileo HTTP), tough-cookie, zod, pino.

---

## File Structure

```
backend/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── Dockerfile
├── .dockerignore
├── .gitignore
├── .env.example
├── src/
│   ├── server.ts                 # Hono app, route registration, startup
│   ├── config.ts                 # env var parsing (zod), single source of truth
│   ├── logger.ts                 # pino instance, redaction config
│   ├── auth/
│   │   └── bearerAuth.ts         # Hono middleware
│   ├── routes/
│   │   ├── health.ts             # GET /health
│   │   ├── caption.ts            # POST /caption
│   │   ├── post.ts               # POST /post
│   │   ├── pads.ts               # GET /pads
│   │   └── gazette.ts            # GET /gazette-deadline
│   ├── llm/
│   │   ├── CaptionService.ts     # prompt building + Claude call
│   │   └── claudeClient.ts       # thin Claude Agent SDK wrapper
│   ├── famileo/
│   │   ├── types.ts              # Pad, Gazette, PostInput, PostResult
│   │   ├── FamileoClient.ts      # interface
│   │   ├── MockFamileoClient.ts  # in-memory impl
│   │   └── sessionStore.ts       # encrypted cookie persistence (SQLite)
│   └── db/
│       └── sqlite.ts             # better-sqlite3 init + migrations
└── tests/
    ├── caption.route.test.ts
    ├── post.route.test.ts
    ├── pads.route.test.ts
    ├── gazette.route.test.ts
    ├── auth.test.ts
    └── famileo.mock.test.ts
```

---

## Task 1: Project scaffolding

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.gitignore`
- Create: `backend/.dockerignore`
- Create: `backend/vitest.config.ts`
- Create: `backend/.env.example`

- [ ] **Step 1: Init repo and backend folder**

Run (from `/Users/toam/Documents/FamiliHelp`):
```bash
git init
mkdir -p backend
cd backend
```

- [ ] **Step 2: Create `backend/package.json`**

```json
{
  "name": "familieohelper-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.0",
    "@hono/node-server": "^1.13.0",
    "better-sqlite3": "^11.3.0",
    "hono": "^4.6.0",
    "pino": "^9.5.0",
    "tough-cookie": "^5.0.0",
    "undici": "^7.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vitest": "^2.1.0"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

- [ ] **Step 3: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create `backend/.gitignore`**

```
node_modules
dist
*.log
.env
.env.local
data/
coverage/
```

- [ ] **Step 5: Create `backend/.dockerignore`**

```
node_modules
dist
.env
.env.local
data/
coverage/
.git
tests
*.log
```

- [ ] **Step 6: Create `backend/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
});
```

- [ ] **Step 7: Create `backend/.env.example`**

```
PORT=8787
BACKEND_BEARER_TOKEN=replace-me-with-a-long-random-string
LOG_LEVEL=info
DATA_DIR=./data
SESSION_ENCRYPTION_KEY=replace-me-with-32-byte-base64
FAMILEO_USERNAME=
FAMILEO_PASSWORD=
CLAUDE_OAUTH_TOKEN=
USE_MOCK_FAMILEO=true
```

- [ ] **Step 8: Install dependencies**

Run: `cd backend && npm install`
Expected: `node_modules/` populated, no errors.

- [ ] **Step 9: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/tsconfig.json backend/.gitignore backend/.dockerignore backend/vitest.config.ts backend/.env.example
git commit -m "chore(backend): scaffold project"
```

---

## Task 2: Config + logger

**Files:**
- Create: `backend/src/config.ts`
- Create: `backend/src/logger.ts`
- Test: `backend/tests/config.test.ts`

- [ ] **Step 1: Write failing test `backend/tests/config.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("parses required env vars", () => {
    const cfg = loadConfig({
      PORT: "9000",
      BACKEND_BEARER_TOKEN: "tok",
      SESSION_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
      DATA_DIR: "/tmp/data",
      LOG_LEVEL: "debug",
      USE_MOCK_FAMILEO: "true",
    });
    expect(cfg.port).toBe(9000);
    expect(cfg.bearerToken).toBe("tok");
    expect(cfg.useMockFamileo).toBe(true);
  });

  it("throws if bearer token missing", () => {
    expect(() => loadConfig({})).toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `cd backend && npm test -- config`
Expected: FAIL — `loadConfig` not found.

- [ ] **Step 3: Implement `backend/src/config.ts`**

```ts
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
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd backend && npm test -- config`
Expected: PASS.

- [ ] **Step 5: Implement `backend/src/logger.ts`**

```ts
import pino from "pino";

export function createLogger(level: string) {
  return pino({
    level,
    redact: {
      paths: [
        "password",
        "*.password",
        "*.cookie",
        "*.token",
        "headers.authorization",
        "headers.cookie",
      ],
      remove: true,
    },
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/config.ts backend/src/logger.ts backend/tests/config.test.ts
git commit -m "feat(backend): config loader (zod) + redacting logger"
```

---

## Task 3: Bearer auth middleware

**Files:**
- Create: `backend/src/auth/bearerAuth.ts`
- Test: `backend/tests/auth.test.ts`

- [ ] **Step 1: Write failing test `backend/tests/auth.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { bearerAuth } from "../src/auth/bearerAuth.js";

function makeApp(token: string) {
  const app = new Hono();
  app.use("*", bearerAuth(token));
  app.get("/x", (c) => c.text("ok"));
  return app;
}

describe("bearerAuth", () => {
  it("401 when no header", async () => {
    const res = await makeApp("secret").request("/x");
    expect(res.status).toBe(401);
  });

  it("401 when wrong token", async () => {
    const res = await makeApp("secret").request("/x", {
      headers: { authorization: "Bearer nope" },
    });
    expect(res.status).toBe(401);
  });

  it("200 when correct token", async () => {
    const res = await makeApp("secret").request("/x", {
      headers: { authorization: "Bearer secret" },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `cd backend && npm test -- auth`
Expected: FAIL — `bearerAuth` not found.

- [ ] **Step 3: Implement `backend/src/auth/bearerAuth.ts`**

```ts
import type { MiddlewareHandler } from "hono";
import { timingSafeEqual } from "node:crypto";

export function bearerAuth(expected: string): MiddlewareHandler {
  const expectedBuf = Buffer.from(expected);
  return async (c, next) => {
    const header = c.req.header("authorization") ?? "";
    const match = /^Bearer (.+)$/.exec(header);
    if (!match) return c.json({ error: "unauthorized" }, 401);
    const provided = Buffer.from(match[1]);
    if (provided.length !== expectedBuf.length) return c.json({ error: "unauthorized" }, 401);
    if (!timingSafeEqual(provided, expectedBuf)) return c.json({ error: "unauthorized" }, 401);
    await next();
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd backend && npm test -- auth`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/bearerAuth.ts backend/tests/auth.test.ts
git commit -m "feat(backend): bearer auth middleware with timing-safe compare"
```

---

## Task 4: Famileo types + FamileoClient interface + MockFamileoClient

**Files:**
- Create: `backend/src/famileo/types.ts`
- Create: `backend/src/famileo/FamileoClient.ts`
- Create: `backend/src/famileo/MockFamileoClient.ts`
- Test: `backend/tests/famileo.mock.test.ts`

- [ ] **Step 1: Create `backend/src/famileo/types.ts`**

```ts
export type Pad = {
  id: string;
  name: string;
};

export type Gazette = {
  id: string;
  padId: string;
  closesAt: string; // ISO datetime
  publishedAt?: string;
};

export type PhotoUpload = {
  filename: string;
  contentType: string;
  bytes: Buffer;
};

export type PostInput = {
  padId: string;
  text: string;
  photos: PhotoUpload[];
};

export type PostResult = {
  postId: string;
  padId: string;
  postedAt: string;
};
```

- [ ] **Step 2: Create `backend/src/famileo/FamileoClient.ts`**

```ts
import type { Pad, Gazette, PostInput, PostResult } from "./types.js";

export interface FamileoClient {
  /** Ensure a valid session exists. Re-logs in if expired. */
  ensureSession(): Promise<void>;
  listPads(): Promise<Pad[]>;
  listGazettes(padId: string): Promise<Gazette[]>;
  createPost(input: PostInput): Promise<PostResult>;
}
```

- [ ] **Step 3: Write failing test `backend/tests/famileo.mock.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { MockFamileoClient } from "../src/famileo/MockFamileoClient.js";

describe("MockFamileoClient", () => {
  it("lists seeded pads", async () => {
    const c = new MockFamileoClient();
    await c.ensureSession();
    const pads = await c.listPads();
    expect(pads.length).toBeGreaterThan(0);
    expect(pads[0]).toHaveProperty("id");
    expect(pads[0]).toHaveProperty("name");
  });

  it("returns the next closing gazette", async () => {
    const c = new MockFamileoClient();
    const pads = await c.listPads();
    const gazettes = await c.listGazettes(pads[0]!.id);
    expect(gazettes.length).toBeGreaterThan(0);
    expect(new Date(gazettes[0]!.closesAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("creates a post and returns an id", async () => {
    const c = new MockFamileoClient();
    const pads = await c.listPads();
    const result = await c.createPost({
      padId: pads[0]!.id,
      text: "hello",
      photos: [
        { filename: "a.jpg", contentType: "image/jpeg", bytes: Buffer.from("xxxx") },
      ],
    });
    expect(result.postId).toMatch(/^post_/);
    expect(result.padId).toBe(pads[0]!.id);
  });

  it("rejects unknown padId", async () => {
    const c = new MockFamileoClient();
    await expect(
      c.createPost({ padId: "nope", text: "x", photos: [] }),
    ).rejects.toThrow(/unknown pad/i);
  });
});
```

- [ ] **Step 4: Run test, verify failure**

Run: `cd backend && npm test -- famileo.mock`
Expected: FAIL — `MockFamileoClient` not found.

- [ ] **Step 5: Implement `backend/src/famileo/MockFamileoClient.ts`**

```ts
import type { FamileoClient } from "./FamileoClient.js";
import type { Pad, Gazette, PostInput, PostResult } from "./types.js";

export class MockFamileoClient implements FamileoClient {
  private pads: Pad[] = [
    { id: "pad_grandparents", name: "Grands-parents" },
  ];
  private gazettes: Map<string, Gazette[]> = new Map();
  private counter = 0;

  constructor() {
    for (const p of this.pads) {
      this.gazettes.set(p.id, [
        {
          id: `gz_${p.id}_next`,
          padId: p.id,
          closesAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        },
      ]);
    }
  }

  async ensureSession(): Promise<void> {
    // no-op
  }

  async listPads(): Promise<Pad[]> {
    return [...this.pads];
  }

  async listGazettes(padId: string): Promise<Gazette[]> {
    const g = this.gazettes.get(padId);
    if (!g) throw new Error(`unknown pad: ${padId}`);
    return [...g];
  }

  async createPost(input: PostInput): Promise<PostResult> {
    if (!this.pads.some((p) => p.id === input.padId)) {
      throw new Error(`unknown pad: ${input.padId}`);
    }
    this.counter += 1;
    return {
      postId: `post_${this.counter}`,
      padId: input.padId,
      postedAt: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 6: Run tests, verify pass**

Run: `cd backend && npm test -- famileo.mock`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/famileo backend/tests/famileo.mock.test.ts
git commit -m "feat(backend): famileo types, client interface, mock implementation"
```

---

## Task 5: SQLite store + encrypted session store

**Files:**
- Create: `backend/src/db/sqlite.ts`
- Create: `backend/src/famileo/sessionStore.ts`
- Test: `backend/tests/sessionStore.test.ts`

- [ ] **Step 1: Implement `backend/src/db/sqlite.ts`**

```ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export function openDb(dataDir: string) {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "backend.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS famileo_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ciphertext BLOB NOT NULL,
      iv BLOB NOT NULL,
      tag BLOB NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export type Db = ReturnType<typeof openDb>;
```

- [ ] **Step 2: Write failing test `backend/tests/sessionStore.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDb } from "../src/db/sqlite.js";
import { SessionStore } from "../src/famileo/sessionStore.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "fh-test-"));
});

describe("SessionStore", () => {
  it("round-trips an encrypted session", () => {
    const db = openDb(dir);
    const key = Buffer.alloc(32, 7);
    const store = new SessionStore(db, key);
    store.save({ cookies: "session=abc123" });
    const got = store.load();
    expect(got?.cookies).toBe("session=abc123");
  });

  it("returns null when empty", () => {
    const db = openDb(dir);
    const key = Buffer.alloc(32, 1);
    const store = new SessionStore(db, key);
    expect(store.load()).toBeNull();
  });

  it("fails to decrypt with wrong key", () => {
    const db = openDb(dir);
    const store1 = new SessionStore(db, Buffer.alloc(32, 1));
    store1.save({ cookies: "x" });
    const store2 = new SessionStore(db, Buffer.alloc(32, 2));
    expect(() => store2.load()).toThrow();
  });
});
```

- [ ] **Step 3: Run test, verify failure**

Run: `cd backend && npm test -- sessionStore`
Expected: FAIL — `SessionStore` not found.

- [ ] **Step 4: Implement `backend/src/famileo/sessionStore.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Db } from "../db/sqlite.js";

export type SessionData = {
  cookies: string;
};

export class SessionStore {
  constructor(private db: Db, private key: Buffer) {
    if (key.length !== 32) throw new Error("encryption key must be 32 bytes");
  }

  save(data: SessionData): void {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(data), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const stmt = this.db.prepare(`
      INSERT INTO famileo_session (id, ciphertext, iv, tag, updated_at)
      VALUES (1, @ciphertext, @iv, @tag, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        ciphertext = excluded.ciphertext,
        iv = excluded.iv,
        tag = excluded.tag,
        updated_at = excluded.updated_at
    `);
    stmt.run({ ciphertext, iv, tag, updated_at: new Date().toISOString() });
  }

  load(): SessionData | null {
    const row = this.db
      .prepare("SELECT ciphertext, iv, tag FROM famileo_session WHERE id = 1")
      .get() as { ciphertext: Buffer; iv: Buffer; tag: Buffer } | undefined;
    if (!row) return null;
    const decipher = createDecipheriv("aes-256-gcm", this.key, row.iv);
    decipher.setAuthTag(row.tag);
    const plaintext = Buffer.concat([decipher.update(row.ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as SessionData;
  }
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd backend && npm test -- sessionStore`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/db backend/src/famileo/sessionStore.ts backend/tests/sessionStore.test.ts
git commit -m "feat(backend): sqlite + AES-GCM encrypted session store"
```

---

## Task 6: Claude client wrapper (CaptionService)

**Files:**
- Create: `backend/src/llm/claudeClient.ts`
- Create: `backend/src/llm/CaptionService.ts`
- Test: `backend/tests/caption.service.test.ts`

- [ ] **Step 1: Create `backend/src/llm/claudeClient.ts`**

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

export type ClaudeOptions = {
  oauthToken: string;
};

export interface ClaudeClient {
  prompt(text: string): Promise<string>;
}

export class ClaudeAgentSdkClient implements ClaudeClient {
  constructor(private opts: ClaudeOptions) {}

  async prompt(text: string): Promise<string> {
    let output = "";
    const stream = query({
      prompt: text,
      options: {
        env: {
          CLAUDE_CODE_OAUTH_TOKEN: this.opts.oauthToken,
        },
        model: "claude-haiku-4-5-20251001",
        permissionMode: "bypassPermissions",
      },
    });
    for await (const msg of stream) {
      if (msg.type === "assistant") {
        for (const block of msg.message.content) {
          if (block.type === "text") output += block.text;
        }
      }
    }
    return output.trim();
  }
}
```

- [ ] **Step 2: Write failing test `backend/tests/caption.service.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { CaptionService } from "../src/llm/CaptionService.js";
import type { ClaudeClient } from "../src/llm/claudeClient.js";

class FakeClaude implements ClaudeClient {
  public lastPrompt = "";
  constructor(private reply: string) {}
  async prompt(text: string) {
    this.lastPrompt = text;
    return this.reply;
  }
}

describe("CaptionService", () => {
  it("generates a caption from metadata", async () => {
    const claude = new FakeClaude("Belle balade dimanche au parc.");
    const svc = new CaptionService(claude);
    const caption = await svc.generate({
      date: "2026-05-10",
      city: "Lyon",
      photoCount: 3,
      weekday: "dimanche",
    });
    expect(caption).toBe("Belle balade dimanche au parc.");
    expect(claude.lastPrompt).toContain("Lyon");
    expect(claude.lastPrompt).toContain("dimanche");
    expect(claude.lastPrompt).toContain("3");
  });

  it("reformulates a transcribed text", async () => {
    const claude = new FakeClaude("On a passé un super dimanche au parc.");
    const svc = new CaptionService(claude);
    const caption = await svc.reformulate(
      "euh on a fait un truc au parc dimanche c'était cool",
    );
    expect(caption).toBe("On a passé un super dimanche au parc.");
    expect(claude.lastPrompt).toContain("euh on a fait");
  });

  it("falls back to a template if claude throws", async () => {
    const claude: ClaudeClient = {
      prompt: async () => {
        throw new Error("network down");
      },
    };
    const svc = new CaptionService(claude);
    const caption = await svc.generate({
      date: "2026-05-10",
      city: "Lyon",
      photoCount: 2,
      weekday: "dimanche",
    });
    expect(caption).toContain("Lyon");
  });
});
```

- [ ] **Step 3: Run test, verify failure**

Run: `cd backend && npm test -- caption.service`
Expected: FAIL — `CaptionService` not found.

- [ ] **Step 4: Implement `backend/src/llm/CaptionService.ts`**

```ts
import type { ClaudeClient } from "./claudeClient.js";

export type CaptionMetadata = {
  date: string;          // ISO date YYYY-MM-DD
  city?: string;         // reverse-geocoded city
  photoCount: number;
  weekday: string;       // "dimanche"
};

export class CaptionService {
  constructor(private claude: ClaudeClient) {}

  async generate(meta: CaptionMetadata): Promise<string> {
    const prompt = this.buildGeneratePrompt(meta);
    try {
      const out = await this.claude.prompt(prompt);
      if (!out) return this.fallback(meta);
      return out;
    } catch {
      return this.fallback(meta);
    }
  }

  async reformulate(transcribed: string): Promise<string> {
    const prompt = [
      "Tu reçois une transcription brute d'une note vocale en français.",
      "Reformule-la en 1 à 3 phrases naturelles pour une légende familiale Famileo destinée aux grands-parents.",
      "Ne fais pas de listes. Pas d'emojis. Garde le ton chaleureux et simple.",
      "",
      "Transcription :",
      transcribed,
      "",
      "Reformulation :",
    ].join("\n");
    try {
      const out = await this.claude.prompt(prompt);
      return out || transcribed;
    } catch {
      return transcribed;
    }
  }

  private buildGeneratePrompt(meta: CaptionMetadata): string {
    return [
      "Tu écris une courte légende en français pour un post Famileo destiné aux grands-parents.",
      "Contraintes : 1 à 3 phrases, ton chaleureux et simple, pas d'emojis, pas de hashtag.",
      "Ne pas inventer d'événements précis : reste évocateur (balade, moment, journée…).",
      "",
      "Métadonnées :",
      `- Date : ${meta.date} (${meta.weekday})`,
      meta.city ? `- Lieu : ${meta.city}` : "- Lieu : inconnu",
      `- Nombre de photos : ${meta.photoCount}`,
      "",
      "Légende :",
    ].join("\n");
  }

  private fallback(meta: CaptionMetadata): string {
    const place = meta.city ? ` à ${meta.city}` : "";
    return `Petit moment partagé ${meta.weekday}${place}.`;
  }
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd backend && npm test -- caption.service`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/llm backend/tests/caption.service.test.ts
git commit -m "feat(backend): caption service with claude agent sdk + fallback"
```

---

## Task 7: Server bootstrap + /health route

**Files:**
- Create: `backend/src/server.ts`
- Create: `backend/src/routes/health.ts`
- Test: `backend/tests/health.route.test.ts`

- [ ] **Step 1: Create `backend/src/routes/health.ts`**

```ts
import { Hono } from "hono";

export function healthRoutes() {
  const app = new Hono();
  app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));
  return app;
}
```

- [ ] **Step 2: Write failing test `backend/tests/health.route.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildApp } from "../src/server.js";

describe("GET /health", () => {
  it("returns ok without auth", async () => {
    const app = buildApp({
      port: 0,
      bearerToken: "secret",
      logLevel: "error",
      dataDir: ":memory:",
      sessionEncryptionKey: Buffer.alloc(32, 0),
      useMockFamileo: true,
    });
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
```

- [ ] **Step 3: Run test, verify failure**

Run: `cd backend && npm test -- health.route`
Expected: FAIL — `buildApp` not found.

- [ ] **Step 4: Implement `backend/src/server.ts`**

```ts
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

  // protected sub-app for everything else
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
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd backend && npm test -- health.route`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/server.ts backend/src/routes/health.ts backend/tests/health.route.test.ts
git commit -m "feat(backend): server bootstrap + /health route"
```

---

## Task 8: POST /caption route

**Files:**
- Create: `backend/src/routes/caption.ts`
- Modify: `backend/src/server.ts` (wire route)
- Test: `backend/tests/caption.route.test.ts`

- [ ] **Step 1: Write failing test `backend/tests/caption.route.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { captionRoutes } from "../src/routes/caption.js";
import { CaptionService } from "../src/llm/CaptionService.js";
import type { ClaudeClient } from "../src/llm/claudeClient.js";

const fakeClaude: ClaudeClient = {
  prompt: async () => "Joli moment de famille.",
};

function makeApp() {
  const app = new Hono();
  app.route("/", captionRoutes(new CaptionService(fakeClaude)));
  return app;
}

describe("POST /caption", () => {
  it("returns a caption from metadata", async () => {
    const res = await makeApp().request("/caption", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: "2026-05-10",
        city: "Lyon",
        photoCount: 2,
        weekday: "dimanche",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { caption: string };
    expect(body.caption).toBe("Joli moment de famille.");
  });

  it("400 on bad input", async () => {
    const res = await makeApp().request("/caption", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ city: "Lyon" }),
    });
    expect(res.status).toBe(400);
  });

  it("reformulates when mode=reformulate", async () => {
    const res = await makeApp().request("/caption?mode=reformulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcribed: "balade au parc cool" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { caption: string };
    expect(body.caption).toBe("Joli moment de famille.");
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `cd backend && npm test -- caption.route`
Expected: FAIL.

- [ ] **Step 3: Implement `backend/src/routes/caption.ts`**

```ts
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
```

- [ ] **Step 4: Wire route in `backend/src/server.ts`**

Modify the `buildApp` function to accept services and register the route. Replace the existing `buildApp` and `startServer` with:

```ts
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
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd backend && npm test -- caption`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/caption.ts backend/src/server.ts backend/tests/caption.route.test.ts
git commit -m "feat(backend): POST /caption route with generate + reformulate modes"
```

---

## Task 9: GET /pads route

**Files:**
- Create: `backend/src/routes/pads.ts`
- Modify: `backend/src/server.ts` (inject FamileoClient + wire route)
- Test: `backend/tests/pads.route.test.ts`

- [ ] **Step 1: Write failing test `backend/tests/pads.route.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { padsRoutes } from "../src/routes/pads.js";
import { MockFamileoClient } from "../src/famileo/MockFamileoClient.js";

function makeApp() {
  const app = new Hono();
  app.route("/", padsRoutes(new MockFamileoClient()));
  return app;
}

describe("GET /pads", () => {
  it("returns pads from the famileo client", async () => {
    const res = await makeApp().request("/pads");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { pads: Array<{ id: string; name: string }> };
    expect(body.pads.length).toBeGreaterThan(0);
    expect(body.pads[0]!.id).toBe("pad_grandparents");
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd backend && npm test -- pads.route`
Expected: FAIL.

- [ ] **Step 3: Implement `backend/src/routes/pads.ts`**

```ts
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
```

- [ ] **Step 4: Wire in `backend/src/server.ts`**

Update `Services` and `buildServices` and `buildApp` (replace the relevant parts):

```ts
import { padsRoutes } from "./routes/pads.js";
import type { FamileoClient } from "./famileo/FamileoClient.js";
import { MockFamileoClient } from "./famileo/MockFamileoClient.js";

export type Services = {
  caption: CaptionService;
  famileo: FamileoClient;
};

export function buildServices(cfg: Config): Services {
  const claude: ClaudeClient = cfg.claudeOauthToken
    ? new ClaudeAgentSdkClient({ oauthToken: cfg.claudeOauthToken })
    : { prompt: async () => "" };
  const famileo: FamileoClient = cfg.useMockFamileo
    ? new MockFamileoClient()
    : (() => {
        throw new Error("WebApiFamileoClient not yet implemented");
      })();
  return {
    caption: new CaptionService(claude),
    famileo,
  };
}
```

And add inside `buildApp` in the protected sub-app section:

```ts
protectedApp.route("/", padsRoutes(svc.famileo));
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd backend && npm test -- pads`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/pads.ts backend/src/server.ts backend/tests/pads.route.test.ts
git commit -m "feat(backend): GET /pads route"
```

---

## Task 10: GET /gazette-deadline route

**Files:**
- Create: `backend/src/routes/gazette.ts`
- Modify: `backend/src/server.ts`
- Test: `backend/tests/gazette.route.test.ts`

- [ ] **Step 1: Write failing test `backend/tests/gazette.route.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { gazetteRoutes } from "../src/routes/gazette.js";
import { MockFamileoClient } from "../src/famileo/MockFamileoClient.js";

function makeApp() {
  const app = new Hono();
  app.route("/", gazetteRoutes(new MockFamileoClient()));
  return app;
}

describe("GET /gazette-deadline", () => {
  it("returns next closing date for a pad", async () => {
    const res = await makeApp().request("/gazette-deadline?padId=pad_grandparents");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { padId: string; closesAt: string };
    expect(body.padId).toBe("pad_grandparents");
    expect(new Date(body.closesAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("400 when padId missing", async () => {
    const res = await makeApp().request("/gazette-deadline");
    expect(res.status).toBe(400);
  });

  it("404 for unknown pad", async () => {
    const res = await makeApp().request("/gazette-deadline?padId=nope");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd backend && npm test -- gazette.route`
Expected: FAIL.

- [ ] **Step 3: Implement `backend/src/routes/gazette.ts`**

```ts
import { Hono } from "hono";
import type { FamileoClient } from "../famileo/FamileoClient.js";

export function gazetteRoutes(famileo: FamileoClient) {
  const app = new Hono();
  app.get("/gazette-deadline", async (c) => {
    const padId = c.req.query("padId");
    if (!padId) return c.json({ error: "padId required" }, 400);
    await famileo.ensureSession();
    try {
      const gazettes = await famileo.listGazettes(padId);
      const upcoming = gazettes
        .filter((g) => new Date(g.closesAt).getTime() > Date.now())
        .sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());
      if (upcoming.length === 0) return c.json({ error: "no upcoming gazette" }, 404);
      return c.json({ padId, closesAt: upcoming[0]!.closesAt });
    } catch (e) {
      if ((e as Error).message.toLowerCase().includes("unknown pad")) {
        return c.json({ error: "unknown pad" }, 404);
      }
      throw e;
    }
  });
  return app;
}
```

- [ ] **Step 4: Wire in `backend/src/server.ts`**

Add import and registration:
```ts
import { gazetteRoutes } from "./routes/gazette.js";
// inside buildApp protected sub-app:
protectedApp.route("/", gazetteRoutes(svc.famileo));
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd backend && npm test -- gazette`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/gazette.ts backend/src/server.ts backend/tests/gazette.route.test.ts
git commit -m "feat(backend): GET /gazette-deadline route"
```

---

## Task 11: POST /post route (multipart upload)

**Files:**
- Create: `backend/src/routes/post.ts`
- Modify: `backend/src/server.ts`
- Test: `backend/tests/post.route.test.ts`

- [ ] **Step 1: Write failing test `backend/tests/post.route.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { postRoutes } from "../src/routes/post.js";
import { MockFamileoClient } from "../src/famileo/MockFamileoClient.js";

function makeApp() {
  const app = new Hono();
  app.route("/", postRoutes(new MockFamileoClient()));
  return app;
}

function buildFormData(opts: { padId?: string; text?: string; photos: { name: string; data: Uint8Array }[] }) {
  const fd = new FormData();
  if (opts.padId !== undefined) fd.append("padId", opts.padId);
  if (opts.text !== undefined) fd.append("text", opts.text);
  for (const p of opts.photos) {
    fd.append("photos", new Blob([p.data], { type: "image/jpeg" }), p.name);
  }
  return fd;
}

describe("POST /post", () => {
  it("creates a post and returns the post id", async () => {
    const fd = buildFormData({
      padId: "pad_grandparents",
      text: "hello grandparents",
      photos: [{ name: "a.jpg", data: new Uint8Array([1, 2, 3]) }],
    });
    const res = await makeApp().request("/post", { method: "POST", body: fd });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { postId: string; padId: string };
    expect(body.postId).toMatch(/^post_/);
    expect(body.padId).toBe("pad_grandparents");
  });

  it("400 when padId missing", async () => {
    const fd = buildFormData({ text: "x", photos: [{ name: "a.jpg", data: new Uint8Array([1]) }] });
    const res = await makeApp().request("/post", { method: "POST", body: fd });
    expect(res.status).toBe(400);
  });

  it("400 when no photos", async () => {
    const fd = buildFormData({ padId: "pad_grandparents", text: "x", photos: [] });
    const res = await makeApp().request("/post", { method: "POST", body: fd });
    expect(res.status).toBe(400);
  });

  it("400 when more than 4 photos", async () => {
    const fd = buildFormData({
      padId: "pad_grandparents",
      text: "x",
      photos: Array.from({ length: 5 }, (_, i) => ({
        name: `${i}.jpg`,
        data: new Uint8Array([i]),
      })),
    });
    const res = await makeApp().request("/post", { method: "POST", body: fd });
    expect(res.status).toBe(400);
  });

  it("404 for unknown pad", async () => {
    const fd = buildFormData({
      padId: "nope",
      text: "x",
      photos: [{ name: "a.jpg", data: new Uint8Array([1]) }],
    });
    const res = await makeApp().request("/post", { method: "POST", body: fd });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd backend && npm test -- post.route`
Expected: FAIL.

- [ ] **Step 3: Implement `backend/src/routes/post.ts`**

```ts
import { Hono } from "hono";
import type { FamileoClient } from "../famileo/FamileoClient.js";
import type { PhotoUpload } from "../famileo/types.js";

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export function postRoutes(famileo: FamileoClient) {
  const app = new Hono();
  app.post("/post", async (c) => {
    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      return c.json({ error: "invalid multipart body" }, 400);
    }

    const padId = form.get("padId");
    const text = form.get("text");
    const rawPhotos = form.getAll("photos");

    if (typeof padId !== "string" || padId.length === 0) {
      return c.json({ error: "padId required" }, 400);
    }
    if (typeof text !== "string" || text.trim().length === 0) {
      return c.json({ error: "text required" }, 400);
    }
    if (rawPhotos.length === 0) return c.json({ error: "at least one photo required" }, 400);
    if (rawPhotos.length > MAX_PHOTOS) {
      return c.json({ error: `at most ${MAX_PHOTOS} photos` }, 400);
    }

    const photos: PhotoUpload[] = [];
    for (const raw of rawPhotos) {
      if (!(raw instanceof Blob)) return c.json({ error: "invalid photo" }, 400);
      if (raw.size > MAX_PHOTO_BYTES) return c.json({ error: "photo too large" }, 400);
      const bytes = Buffer.from(await raw.arrayBuffer());
      const filename = (raw as File).name ?? "photo.jpg";
      photos.push({
        filename,
        contentType: raw.type || "image/jpeg",
        bytes,
      });
    }

    await famileo.ensureSession();
    try {
      const result = await famileo.createPost({ padId, text, photos });
      return c.json(result);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.toLowerCase().includes("unknown pad")) {
        return c.json({ error: "unknown pad" }, 404);
      }
      throw e;
    }
  });
  return app;
}
```

- [ ] **Step 4: Wire in `backend/src/server.ts`**

```ts
import { postRoutes } from "./routes/post.js";
// inside buildApp protected sub-app:
protectedApp.route("/", postRoutes(svc.famileo));
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd backend && npm test -- post.route`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/post.ts backend/src/server.ts backend/tests/post.route.test.ts
git commit -m "feat(backend): POST /post multipart route with size and count guards"
```

---

## Task 12: Integration smoke test (auth + all routes)

**Files:**
- Create: `backend/tests/smoke.test.ts`

- [ ] **Step 1: Write smoke test `backend/tests/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildApp, buildServices } from "../src/server.js";
import type { Config } from "../src/config.js";

const cfg: Config = {
  port: 0,
  bearerToken: "secret-token-1234567890",
  logLevel: "error",
  dataDir: ":memory:",
  sessionEncryptionKey: Buffer.alloc(32, 0),
  useMockFamileo: true,
};

function authHeaders() {
  return { authorization: `Bearer ${cfg.bearerToken}` };
}

describe("smoke", () => {
  const app = buildApp(cfg, buildServices(cfg));

  it("rejects unauth /pads", async () => {
    const res = await app.request("/pads");
    expect(res.status).toBe(401);
  });

  it("/health does not require auth", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("end-to-end : pads → gazette → post", async () => {
    const padsRes = await app.request("/pads", { headers: authHeaders() });
    expect(padsRes.status).toBe(200);
    const padsBody = (await padsRes.json()) as { pads: Array<{ id: string }> };
    const padId = padsBody.pads[0]!.id;

    const gazRes = await app.request(`/gazette-deadline?padId=${padId}`, { headers: authHeaders() });
    expect(gazRes.status).toBe(200);

    const fd = new FormData();
    fd.append("padId", padId);
    fd.append("text", "smoke");
    fd.append("photos", new Blob([new Uint8Array([1, 2])], { type: "image/jpeg" }), "x.jpg");
    const postRes = await app.request("/post", {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    expect(postRes.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests, verify pass**

Run: `cd backend && npm test -- smoke`
Expected: PASS (3 tests).

- [ ] **Step 3: Run full test suite**

Run: `cd backend && npm test`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/smoke.test.ts
git commit -m "test(backend): end-to-end smoke covering auth + all routes"
```

---

## Task 13: Dockerfile + Dokploy config

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dokploy.yml` (informational; actual config lives in Dokploy UI)

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN mkdir -p /app/data
VOLUME ["/app/data"]
ENV DATA_DIR=/app/data
EXPOSE 8787
CMD ["node", "dist/server.js"]
```

- [ ] **Step 2: Create `backend/.dokploy.yml`** (documentation only)

```yaml
# Dokploy configuration reference (actual config lives in Dokploy UI).
name: familieohelper-backend
build:
  type: dockerfile
  context: backend
  dockerfile: Dockerfile
runtime:
  port: 8787
  healthCheck:
    path: /health
    interval: 30s
volumes:
  - mountPath: /app/data
    name: familieohelper-data
env:
  required:
    - BACKEND_BEARER_TOKEN
    - SESSION_ENCRYPTION_KEY
    - CLAUDE_OAUTH_TOKEN
    - FAMILEO_USERNAME
    - FAMILEO_PASSWORD
  optional:
    - LOG_LEVEL
    - USE_MOCK_FAMILEO
domain:
  hostname: familieohelper.<user-domain>
  ssl: cloudflare
```

- [ ] **Step 3: Build and run locally to verify Dockerfile**

Run:
```bash
cd backend
docker build -t familieohelper-backend:dev .
docker run --rm -p 8787:8787 \
  -e BACKEND_BEARER_TOKEN=test-token-1234567890 \
  -e SESSION_ENCRYPTION_KEY=$(openssl rand -base64 32) \
  -e USE_MOCK_FAMILEO=true \
  familieohelper-backend:dev &
sleep 2
curl -sf http://localhost:8787/health
docker stop $(docker ps -q --filter ancestor=familieohelper-backend:dev)
```

Expected: `curl` returns `{"ok":true,"ts":"..."}`.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dokploy.yml
git commit -m "chore(backend): Dockerfile + dokploy config reference"
```

---

## Task 14: Deploy to VPS via Dokploy

**Files:** (no source changes — operational task)

- [ ] **Step 1: Push the repo to GitHub**

```bash
git remote add origin git@github.com:Alphaluppi/FamileoHelper.git
git branch -M main
git push -u origin main
```

(Toam must first create the repo `Alphaluppi/FamileoHelper` on GitHub if it doesn't exist.)

- [ ] **Step 2: In Dokploy UI**

1. Create a new Application "familieohelper-backend"
2. Source : Git, repo `Alphaluppi/FamileoHelper`, branch `main`, build context `backend/`
3. Build type : Dockerfile
4. Port : `8787`
5. Health check : `GET /health`
6. Volume : `/app/data` (persistent for SQLite)
7. Domain : configure sous-domaine + SSL (Traefik / Cloudflare)
8. Env vars (all marked as secrets) :
   - `BACKEND_BEARER_TOKEN` : `openssl rand -hex 32`
   - `SESSION_ENCRYPTION_KEY` : `openssl rand -base64 32`
   - `CLAUDE_OAUTH_TOKEN` : (set after Step 3 below)
   - `FAMILEO_USERNAME`, `FAMILEO_PASSWORD` : laisse vide pour MVP (mock activé)
   - `USE_MOCK_FAMILEO` : `true`
   - `LOG_LEVEL` : `info`

- [ ] **Step 3: Generate Claude OAuth token locally**

Run on the dev machine where `claude` is logged in:
```bash
claude setup-token
```
Copy the output → paste into Dokploy `CLAUDE_OAUTH_TOKEN` env var.

(Reference: Claude Agent SDK long-lived OAuth token.)

- [ ] **Step 4: Trigger deployment in Dokploy UI**

Expected : build succeeds, container starts, `/health` returns 200.

- [ ] **Step 5: Smoke-test deployed backend**

Run from local:
```bash
DOMAIN=familieohelper.<your-domain>
TOKEN=<BACKEND_BEARER_TOKEN>
curl -sf https://$DOMAIN/health
curl -sf -H "Authorization: Bearer $TOKEN" https://$DOMAIN/pads
curl -sf -H "Authorization: Bearer $TOKEN" -X POST https://$DOMAIN/caption \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-05-10","city":"Lyon","photoCount":2,"weekday":"dimanche"}'
```

Expected :
- `/health` → `{"ok":true,...}`
- `/pads` → `{"pads":[{"id":"pad_grandparents",...}]}`
- `/caption` → `{"caption":"<text from Claude>"}`

- [ ] **Step 6: Record the deployment in a runbook**

Create `backend/RUNBOOK.md`:

```markdown
# FamileoHelper Backend Runbook

## Deploy
Dokploy auto-deploys on push to `main`.

## Env vars (all secrets)
- `BACKEND_BEARER_TOKEN` — app authenticates with `Authorization: Bearer <this>`
- `SESSION_ENCRYPTION_KEY` — 32 bytes base64, encrypts Famileo cookie at rest
- `CLAUDE_OAUTH_TOKEN` — Claude Max OAuth. Regenerate with `claude setup-token`
- `FAMILEO_USERNAME`, `FAMILEO_PASSWORD` — Famileo credentials (only when `USE_MOCK_FAMILEO=false`)
- `USE_MOCK_FAMILEO` — `true` until WebApiFamileoClient is shipped

## Endpoints
- `GET  /health` — public
- `GET  /pads` — bearer
- `GET  /gazette-deadline?padId=…` — bearer
- `POST /caption` — bearer (body JSON `{date, city?, photoCount, weekday}`; query `?mode=reformulate` with body `{transcribed}`)
- `POST /post` — bearer (multipart : `padId`, `text`, `photos[]` 1-4 files)

## Volumes
- `/app/data/backend.db` — SQLite (Famileo session)

## Rotating tokens
- Bearer : generate new in Dokploy env, restart, update iOS app SecureStore
- Claude OAuth : `claude setup-token` → paste in Dokploy

## Famileo session expired
The backend auto re-logs in on 401. If it loops, check `FAMILEO_USERNAME` / `FAMILEO_PASSWORD`.
```

- [ ] **Step 7: Commit**

```bash
git add backend/RUNBOOK.md
git commit -m "docs(backend): runbook for deployment and ops"
git push
```

---

## Task 15: README at repo root

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# FamileoHelper

Personal mobile companion that scans your camera roll and proposes Famileo posts to send to your grandparents.

## Components

- `backend/` — Node.js HTTP service: caption generation (Claude), Famileo client (mock + future web impl), pad/gazette/post endpoints. Deployed on a personal VPS via Dokploy.
- `app/` — Expo (React Native) mobile app. **Not yet implemented** (Plan 2).

## Status

- [x] Backend MVP (caption + mock Famileo + auth)
- [ ] Mobile app MVP
- [ ] Real Famileo Web API client (requires manual API discovery)

See `docs/superpowers/specs/2026-05-14-familihelp-design.md` for the full design and `docs/superpowers/plans/` for implementation plans.
```

- [ ] **Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: project README"
git push
```

---

## Done criteria for Plan 1 (Backend MVP)

- `npm test` in `backend/` passes all suites locally
- `docker build` succeeds
- Backend deployed to VPS via Dokploy at `https://familieohelper.<domain>`
- All 5 curl commands in Task 14 Step 5 succeed
- `/caption` returns a real Claude-generated French caption when called with valid metadata
- `/post` returns a fake `post_<n>` id (MockFamileoClient — real Famileo posting comes in Plan 3)
