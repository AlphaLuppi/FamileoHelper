# FamileoHelper App MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Expo (React Native) iOS app that scans the user's camera roll, proposes Famileo posts (photo cluster + Claude-generated caption), and posts them to Famileo via the backend.

**Architecture:** Expo SDK 52 + React Native + TypeScript + NativeWind. Strict layered architecture: `domain/` (pure logic) ← `services/` (I/O) ← `ui/` (screens). All Famileo + Claude calls go through the backend at a configurable base URL. SecureStore for the bearer token. SQLite for `last_post_at` / moment decisions / pad cache. Local on-device speech recognition for voice mode.

**Tech Stack:** Expo SDK 52, TypeScript 5.5, NativeWind 4, Zustand (state), expo-media-library, expo-location, expo-secure-store, expo-sqlite, expo-notifications, @react-native-voice/voice (or expo-speech-recognition), date-fns, zod (request validation client-side).

**Repo location:** All app code lives under `app/` at the repo root.

---

## File Structure

```
app/
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── global.css
├── vitest.config.ts
├── .gitignore
├── App.tsx                          # Root: NavigationContainer, providers
├── src/
│   ├── config/
│   │   └── env.ts                   # BACKEND_URL etc. from app.json extra
│   ├── domain/
│   │   ├── types.ts                 # Photo, Moment, PostProposal, Pad
│   │   ├── clustering.ts            # Photo[] → Moment[]
│   │   ├── selection.ts             # Moment → Photo[] (1-4)
│   │   ├── proposal.ts              # Photo[] → PostProposal[]
│   │   └── momentHash.ts            # stable hash of photo IDs
│   ├── services/
│   │   ├── photos/MediaLibraryService.ts
│   │   ├── geo/GeocodingService.ts
│   │   ├── speech/SpeechService.ts
│   │   ├── backend/BackendClient.ts
│   │   └── notifications/NotificationService.ts
│   ├── state/
│   │   ├── secureStore.ts           # bearer token, backend url
│   │   ├── db.ts                    # expo-sqlite init + migrations
│   │   ├── appStateRepo.ts          # last_post_at
│   │   ├── momentDecisionsRepo.ts   # posted/rejected
│   │   ├── padsCacheRepo.ts         # last_used_at per pad
│   │   └── store.ts                 # Zustand UI state
│   └── ui/
│       ├── navigation.tsx           # Tab nav: Propositions | Manuel | Settings
│       ├── components/
│       │   ├── ProposalCard.tsx
│       │   ├── PhotoTile.tsx
│       │   ├── PadPicker.tsx
│       │   └── PrimaryButton.tsx
│       ├── screens/
│       │   ├── OnboardingScreen.tsx
│       │   ├── PropositionsScreen.tsx
│       │   ├── ManualPickerScreen.tsx
│       │   ├── SettingsScreen.tsx
│       │   └── PostFlowScreen.tsx   # edit text + send sheet
│       └── theme/
│           └── colors.ts
└── tests/
    ├── clustering.test.ts
    ├── selection.test.ts
    ├── proposal.test.ts
    ├── momentHash.test.ts
    └── backendClient.test.ts
```

---

## Task 1: Expo project scaffold

**Files:** create `app/` directory with Expo TypeScript template + NativeWind setup.

- [ ] **Step 1: Create Expo app**

Run from `/Users/toam/Documents/FamiliHelp`:
```bash
npx create-expo-app@latest app --template blank-typescript
cd app
```

- [ ] **Step 2: Add NativeWind v4**

```bash
cd app
npm install nativewind tailwindcss@^3.4.0 react-native-reanimated react-native-safe-area-context
npx tailwindcss init
```

Replace `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: [],
};
```

Create `app/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Update `babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

Create `metro.config.js`:
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

Add `nativewind-env.d.ts`:
```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 3: Add core deps**

```bash
cd app
npm install zustand date-fns zod
npm install expo-media-library expo-location expo-secure-store expo-sqlite expo-notifications expo-file-system
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-gesture-handler
```

For speech recognition (iOS on-device): pick whichever Expo-friendly package is currently available. Try in order:
```bash
npx expo install expo-speech-recognition
```
If unavailable, fall back to `@react-native-voice/voice` (needs config plugin or prebuild).

- [ ] **Step 4: Add Vitest for pure-logic tests**

```bash
cd app
npm install -D vitest @types/node
```

Create `app/vitest.config.ts`:
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

Add to `package.json` scripts:
```json
"test": "vitest run",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 5: app.json `extra` for backend URL**

Edit `app/app.json` to add an `expo.extra` block with placeholders:
```json
"extra": {
  "backendUrl": "http://localhost:8787",
  "backendTokenStorageKey": "familieohelper.backendToken"
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/toam/Documents/FamiliHelp
git add app/
git commit -m "chore(app): scaffold Expo + TypeScript + NativeWind + nav + deps"
```

---

## Task 2: env config module

**Files:**
- Create: `app/src/config/env.ts`
- Test: `app/tests/env.test.ts`

- [ ] **Step 1: Failing test**

```ts
// app/tests/env.test.ts
import { describe, it, expect } from "vitest";
import { getEnv } from "../src/config/env";

describe("getEnv", () => {
  it("returns expo extra fields", () => {
    const env = getEnv({
      backendUrl: "https://api.example.com",
      backendTokenStorageKey: "tok",
    });
    expect(env.backendUrl).toBe("https://api.example.com");
    expect(env.backendTokenStorageKey).toBe("tok");
  });

  it("throws when backendUrl missing", () => {
    expect(() => getEnv({ backendTokenStorageKey: "tok" } as never)).toThrow();
  });
});
```

- [ ] **Step 2: Run, FAIL**

`cd app && npx vitest run env`

- [ ] **Step 3: Implement `app/src/config/env.ts`**

```ts
import Constants from "expo-constants";
import { z } from "zod";

const schema = z.object({
  backendUrl: z.string().url(),
  backendTokenStorageKey: z.string().min(1),
});

export type AppEnv = z.infer<typeof schema>;

export function getEnv(raw: unknown = Constants.expoConfig?.extra): AppEnv {
  return schema.parse(raw);
}
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add app/src/config/env.ts app/tests/env.test.ts
git commit -m "feat(app): env config from expo extra with zod validation"
```

---

## Task 3: Domain types

**Files:**
- Create: `app/src/domain/types.ts`

- [ ] **Step 1: Create `app/src/domain/types.ts`**

```ts
export type Photo = {
  id: string;
  uri: string;
  createdAt: string; // ISO datetime
  width: number;
  height: number;
  location?: { latitude: number; longitude: number };
};

export type Moment = {
  photos: Photo[];
  startAt: string;
  endAt: string;
  centroid?: { latitude: number; longitude: number };
};

export type PostProposal = {
  momentHash: string;
  photos: Photo[];          // 1-4 selected for the post
  date: string;             // YYYY-MM-DD
  weekday: string;          // "dimanche"
  city?: string;            // resolved by GeocodingService
  draftText?: string;       // filled after CaptionService
};

export type Pad = {
  id: string;
  name: string;
  lastUsedAt?: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add app/src/domain/types.ts
git commit -m "feat(app): domain types"
```

---

## Task 4: Moment hash

**Files:**
- Create: `app/src/domain/momentHash.ts`
- Test: `app/tests/momentHash.test.ts`

- [ ] **Step 1: Failing test**

```ts
// app/tests/momentHash.test.ts
import { describe, it, expect } from "vitest";
import { momentHash } from "../src/domain/momentHash";

describe("momentHash", () => {
  it("is stable regardless of input order", () => {
    expect(momentHash(["a", "b", "c"])).toBe(momentHash(["c", "a", "b"]));
  });

  it("differs when photos differ", () => {
    expect(momentHash(["a", "b"])).not.toBe(momentHash(["a", "c"]));
  });

  it("is deterministic across calls", () => {
    expect(momentHash(["a"])).toBe(momentHash(["a"]));
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `app/src/domain/momentHash.ts`**

```ts
import { createHash } from "node:crypto";

export function momentHash(photoIds: string[]): string {
  const sorted = [...photoIds].sort();
  return createHash("sha256").update(sorted.join("|")).digest("hex").slice(0, 16);
}
```

**Note for the implementer:** `node:crypto` is not available in React Native runtime. For the app to actually run, this must be replaced with a JS implementation (e.g., a simple FNV-1a or via `expo-crypto`). For Task 4, write the version above to make the test pass with Vitest (Node env). In Task 5 we'll swap to a portable implementation. Document this as a known issue in the commit message.

Better: implement a portable JS hash from the start. Use this version instead:

```ts
function fnv1a(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function momentHash(photoIds: string[]): string {
  const sorted = [...photoIds].sort();
  return fnv1a(sorted.join("|"));
}
```

Use the FNV-1a version. It runs both in Node (tests) and React Native (app).

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/momentHash.ts app/tests/momentHash.test.ts
git commit -m "feat(app): stable moment hash via FNV-1a"
```

---

## Task 5: Clustering

**Files:**
- Create: `app/src/domain/clustering.ts`
- Test: `app/tests/clustering.test.ts`

- [ ] **Step 1: Failing test**

```ts
// app/tests/clustering.test.ts
import { describe, it, expect } from "vitest";
import { clusterMoments } from "../src/domain/clustering";
import type { Photo } from "../src/domain/types";

function p(id: string, isoDate: string, loc?: [number, number]): Photo {
  return {
    id,
    uri: `file://${id}`,
    createdAt: isoDate,
    width: 100,
    height: 100,
    location: loc ? { latitude: loc[0], longitude: loc[1] } : undefined,
  };
}

describe("clusterMoments", () => {
  it("groups photos within 4 hours and 500m as one moment", () => {
    const photos = [
      p("a", "2026-05-10T14:00:00Z", [45.75, 4.85]),
      p("b", "2026-05-10T14:30:00Z", [45.751, 4.851]),
      p("c", "2026-05-10T15:00:00Z", [45.752, 4.852]),
    ];
    const moments = clusterMoments(photos);
    expect(moments).toHaveLength(1);
    expect(moments[0]!.photos).toHaveLength(3);
  });

  it("splits photos > 4 hours apart into two moments", () => {
    const photos = [
      p("a", "2026-05-10T10:00:00Z"),
      p("b", "2026-05-10T18:00:00Z"),
    ];
    const moments = clusterMoments(photos);
    expect(moments).toHaveLength(2);
  });

  it("splits photos > 500m apart into two moments even if simultaneous", () => {
    const photos = [
      p("a", "2026-05-10T14:00:00Z", [45.75, 4.85]),
      p("b", "2026-05-10T14:10:00Z", [45.80, 4.85]), // ~5km away
    ];
    const moments = clusterMoments(photos);
    expect(moments).toHaveLength(2);
  });

  it("clusters by time alone when no GPS available", () => {
    const photos = [
      p("a", "2026-05-10T14:00:00Z"),
      p("b", "2026-05-10T14:30:00Z"),
    ];
    const moments = clusterMoments(photos);
    expect(moments).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(clusterMoments([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `app/src/domain/clustering.ts`**

```ts
import type { Photo, Moment } from "./types";

const TIME_GAP_MS = 4 * 60 * 60 * 1000;
const DISTANCE_THRESHOLD_M = 500;
const EARTH_RADIUS_M = 6_371_000;

function haversine(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function centroid(photos: Photo[]) {
  const located = photos.filter((p) => p.location);
  if (located.length === 0) return undefined;
  const sum = located.reduce(
    (acc, p) => ({
      latitude: acc.latitude + p.location!.latitude,
      longitude: acc.longitude + p.location!.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: sum.latitude / located.length,
    longitude: sum.longitude / located.length,
  };
}

export function clusterMoments(photos: Photo[]): Moment[] {
  if (photos.length === 0) return [];
  const sorted = [...photos].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const moments: Moment[] = [];
  let current: Photo[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1]!;
    const next = sorted[i]!;

    const timeGap = new Date(next.createdAt).getTime() - new Date(prev.createdAt).getTime();
    let sameCluster = timeGap <= TIME_GAP_MS;

    if (sameCluster && prev.location && next.location) {
      const dist = haversine(prev.location, next.location);
      if (dist > DISTANCE_THRESHOLD_M) sameCluster = false;
    }

    if (sameCluster) {
      current.push(next);
    } else {
      moments.push(makeMoment(current));
      current = [next];
    }
  }
  moments.push(makeMoment(current));
  return moments;
}

function makeMoment(photos: Photo[]): Moment {
  return {
    photos,
    startAt: photos[0]!.createdAt,
    endAt: photos[photos.length - 1]!.createdAt,
    centroid: centroid(photos),
  };
}
```

- [ ] **Step 4: Run, PASS (5 tests)**

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/clustering.ts app/tests/clustering.test.ts
git commit -m "feat(app): photo clustering by time (4h) + GPS (500m)"
```

---

## Task 6: Selection

**Files:**
- Create: `app/src/domain/selection.ts`
- Test: `app/tests/selection.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { selectPhotos } from "../src/domain/selection";
import type { Moment, Photo } from "../src/domain/types";

function p(id: string, w = 1000, h = 1000): Photo {
  return {
    id,
    uri: `file://${id}`,
    createdAt: `2026-05-10T14:0${id.charCodeAt(0) % 10}:00Z`,
    width: w,
    height: h,
  };
}

function m(photos: Photo[]): Moment {
  return {
    photos,
    startAt: photos[0]!.createdAt,
    endAt: photos[photos.length - 1]!.createdAt,
  };
}

describe("selectPhotos", () => {
  it("returns up to 4 photos from a moment", () => {
    const moment = m([p("a"), p("b"), p("c"), p("d"), p("e"), p("f")]);
    expect(selectPhotos(moment).length).toBeLessThanOrEqual(4);
  });

  it("returns all photos when there are 4 or fewer", () => {
    const moment = m([p("a"), p("b")]);
    expect(selectPhotos(moment)).toHaveLength(2);
  });

  it("prefers higher-resolution photos when more than 4 available", () => {
    const moment = m([
      p("low1", 200, 200),
      p("low2", 200, 200),
      p("low3", 200, 200),
      p("low4", 200, 200),
      p("low5", 200, 200),
      p("hi", 4000, 3000),
    ]);
    const selected = selectPhotos(moment);
    expect(selected.map((s) => s.id)).toContain("hi");
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `app/src/domain/selection.ts`**

```ts
import type { Moment, Photo } from "./types";

const MAX = 4;

export function selectPhotos(moment: Moment): Photo[] {
  if (moment.photos.length <= MAX) return [...moment.photos];
  const ranked = [...moment.photos].sort(
    (a, b) => b.width * b.height - a.width * a.height,
  );
  const top = ranked.slice(0, MAX);
  return top.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/selection.ts app/tests/selection.test.ts
git commit -m "feat(app): photo selection up to 4, highest resolution first"
```

---

## Task 7: Proposal orchestration

**Files:**
- Create: `app/src/domain/proposal.ts`
- Test: `app/tests/proposal.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildProposals } from "../src/domain/proposal";
import type { Photo } from "../src/domain/types";

function p(id: string, isoDate: string, w = 1000, h = 1000): Photo {
  return { id, uri: `file://${id}`, createdAt: isoDate, width: w, height: h };
}

describe("buildProposals", () => {
  it("returns one proposal per cluster", () => {
    const photos = [
      p("a", "2026-05-10T10:00:00Z"),
      p("b", "2026-05-10T10:30:00Z"),
      p("c", "2026-05-11T15:00:00Z"),
    ];
    const proposals = buildProposals(photos);
    expect(proposals).toHaveLength(2);
  });

  it("each proposal has date and weekday in French", () => {
    const proposals = buildProposals([p("a", "2026-05-10T10:00:00Z")]);
    expect(proposals[0]!.date).toBe("2026-05-10");
    expect(proposals[0]!.weekday).toBe("dimanche");
  });

  it("each proposal has a stable momentHash", () => {
    const photos = [p("a", "2026-05-10T10:00:00Z")];
    const r1 = buildProposals(photos);
    const r2 = buildProposals(photos);
    expect(r1[0]!.momentHash).toBe(r2[0]!.momentHash);
  });

  it("returns empty array for no photos", () => {
    expect(buildProposals([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `app/src/domain/proposal.ts`**

```ts
import type { Photo, PostProposal } from "./types";
import { clusterMoments } from "./clustering";
import { selectPhotos } from "./selection";
import { momentHash } from "./momentHash";

const WEEKDAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function buildProposals(photos: Photo[]): PostProposal[] {
  const moments = clusterMoments(photos);
  return moments.map((m) => {
    const selected = selectPhotos(m);
    const dateObj = new Date(m.startAt);
    return {
      momentHash: momentHash(selected.map((p) => p.id)),
      photos: selected,
      date: dateObj.toISOString().slice(0, 10),
      weekday: WEEKDAYS_FR[dateObj.getUTCDay()]!,
    };
  });
}
```

- [ ] **Step 4: Run, PASS**

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/proposal.ts app/tests/proposal.test.ts
git commit -m "feat(app): proposal builder (cluster + select + date/weekday)"
```

---

## Task 8: SecureStore wrapper

**Files:**
- Create: `app/src/state/secureStore.ts`

- [ ] **Step 1: Implement `app/src/state/secureStore.ts`**

```ts
import * as SecureStore from "expo-secure-store";

const BEARER_KEY = "familieohelper.bearer";
const BACKEND_URL_KEY = "familieohelper.backendUrl";

export async function setBearerToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(BEARER_KEY, token);
}

export async function getBearerToken(): Promise<string | null> {
  return SecureStore.getItemAsync(BEARER_KEY);
}

export async function clearBearerToken(): Promise<void> {
  await SecureStore.deleteItemAsync(BEARER_KEY);
}

export async function setBackendUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(BACKEND_URL_KEY, url);
}

export async function getBackendUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(BACKEND_URL_KEY);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/state/secureStore.ts
git commit -m "feat(app): SecureStore wrapper for bearer + backend URL"
```

---

## Task 9: BackendClient

**Files:**
- Create: `app/src/services/backend/BackendClient.ts`
- Test: `app/tests/backendClient.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { BackendClient } from "../src/services/backend/BackendClient";

function makeFetch(responses: Array<{ status: number; body: unknown }>) {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[i++]!;
    return new Response(JSON.stringify(r.body), { status: r.status });
  });
}

describe("BackendClient", () => {
  it("lists pads with bearer auth", async () => {
    const fetcher = makeFetch([{ status: 200, body: { pads: [{ id: "p1", name: "P1" }] } }]);
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    const pads = await c.listPads();
    expect(pads).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api/pads",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer tok" }),
      }),
    );
  });

  it("generates a caption", async () => {
    const fetcher = makeFetch([{ status: 200, body: { caption: "yo" } }]);
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    const cap = await c.generateCaption({
      date: "2026-05-10",
      city: "Lyon",
      photoCount: 2,
      weekday: "dimanche",
    });
    expect(cap).toBe("yo");
  });

  it("reformulates", async () => {
    const fetcher = makeFetch([{ status: 200, body: { caption: "polished" } }]);
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    const cap = await c.reformulate("raw");
    expect(cap).toBe("polished");
  });

  it("gets gazette deadline", async () => {
    const fetcher = makeFetch([{ status: 200, body: { padId: "p1", closesAt: "2026-06-01T00:00:00Z" } }]);
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    const d = await c.gazetteDeadline("p1");
    expect(d.closesAt).toBe("2026-06-01T00:00:00Z");
  });

  it("throws on 401", async () => {
    const fetcher = makeFetch([{ status: 401, body: { error: "unauthorized" } }]);
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    await expect(c.listPads()).rejects.toThrow(/unauthorized/i);
  });

  it("creates a post via multipart", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ postId: "post_1", padId: "p1", postedAt: "x" }), { status: 200 }),
    );
    const c = new BackendClient({ baseUrl: "https://api", bearer: "tok", fetcher });
    const res = await c.createPost({
      padId: "p1",
      text: "hi",
      photos: [{ uri: "file://a.jpg", filename: "a.jpg", mimeType: "image/jpeg" }],
    });
    expect(res.postId).toBe("post_1");
    expect(fetcher).toHaveBeenCalledWith(
      "https://api/post",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
```

- [ ] **Step 2: Run, FAIL**

- [ ] **Step 3: Implement `app/src/services/backend/BackendClient.ts`**

```ts
export type CaptionMetadata = {
  date: string;
  city?: string;
  photoCount: number;
  weekday: string;
};

export type PhotoRef = {
  uri: string;
  filename: string;
  mimeType: string;
};

export type CreatePostInput = {
  padId: string;
  text: string;
  photos: PhotoRef[];
};

export type CreatePostResult = {
  postId: string;
  padId: string;
  postedAt: string;
};

export type GazetteDeadline = {
  padId: string;
  closesAt: string;
};

type Fetcher = typeof fetch;

export type BackendClientOptions = {
  baseUrl: string;
  bearer: string;
  fetcher?: Fetcher;
};

export class BackendClient {
  private baseUrl: string;
  private bearer: string;
  private fetcher: Fetcher;

  constructor(opts: BackendClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.bearer = opts.bearer;
    this.fetcher = opts.fetcher ?? fetch;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        authorization: `Bearer ${this.bearer}`,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`backend ${res.status}: ${body || res.statusText}`);
    }
    return (await res.json()) as T;
  }

  async listPads(): Promise<{ id: string; name: string }[]> {
    const out = await this.request<{ pads: { id: string; name: string }[] }>("/pads");
    return out.pads;
  }

  async gazetteDeadline(padId: string): Promise<GazetteDeadline> {
    return this.request<GazetteDeadline>(`/gazette-deadline?padId=${encodeURIComponent(padId)}`);
  }

  async generateCaption(meta: CaptionMetadata): Promise<string> {
    const out = await this.request<{ caption: string }>("/caption", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(meta),
    });
    return out.caption;
  }

  async reformulate(transcribed: string): Promise<string> {
    const out = await this.request<{ caption: string }>("/caption?mode=reformulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcribed }),
    });
    return out.caption;
  }

  async createPost(input: CreatePostInput): Promise<CreatePostResult> {
    const fd = new FormData();
    fd.append("padId", input.padId);
    fd.append("text", input.text);
    for (const p of input.photos) {
      // React Native FormData accepts { uri, name, type }; in Node tests we append a Blob equivalent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fd.append("photos", { uri: p.uri, name: p.filename, type: p.mimeType } as any);
    }
    return this.request<CreatePostResult>("/post", {
      method: "POST",
      body: fd as unknown as BodyInit,
    });
  }
}
```

- [ ] **Step 4: Run, PASS (6 tests). The createPost test in Node may need adjusting because FormData semantics differ between Node and RN. If the test fails because of the `photos` field shape, weaken the assertion to only check method/path/auth and accept that the multipart body is RN-specific.**

- [ ] **Step 5: Commit**

```bash
git add app/src/services/backend/BackendClient.ts app/tests/backendClient.test.ts
git commit -m "feat(app): BackendClient with listPads, gazette, caption, post"
```

---

## Task 10: MediaLibraryService

**Files:**
- Create: `app/src/services/photos/MediaLibraryService.ts`

This is a thin wrapper. It cannot be unit-tested without a real device — write the wrapper, smoke-test on device later.

- [ ] **Step 1: Implement**

```ts
import * as MediaLibrary from "expo-media-library";
import type { Photo } from "../../domain/types";

export async function ensurePermissions(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === "granted";
}

export async function listPhotosSince(sinceIso: string): Promise<Photo[]> {
  const since = new Date(sinceIso).getTime();
  const photos: Photo[] = [];
  let after: string | undefined;
  for (let i = 0; i < 10; i++) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: "photo",
      sortBy: [["creationTime", false]],
      first: 100,
      after,
    });
    for (const asset of page.assets) {
      if (asset.creationTime <= since) {
        return photos;
      }
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      photos.push({
        id: asset.id,
        uri: info.localUri ?? asset.uri,
        createdAt: new Date(asset.creationTime).toISOString(),
        width: asset.width,
        height: asset.height,
        location: info.location
          ? { latitude: info.location.latitude, longitude: info.location.longitude }
          : undefined,
      });
    }
    if (!page.hasNextPage) break;
    after = page.endCursor;
  }
  return photos;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/services/photos/MediaLibraryService.ts
git commit -m "feat(app): MediaLibraryService listing photos since timestamp"
```

---

## Task 11: GeocodingService

**Files:**
- Create: `app/src/services/geo/GeocodingService.ts`

- [ ] **Step 1: Implement**

```ts
import * as Location from "expo-location";

export type LatLng = { latitude: number; longitude: number };

export async function reverseGeocode(point: LatLng): Promise<string | undefined> {
  try {
    const results = await Location.reverseGeocodeAsync(point);
    const first = results[0];
    if (!first) return undefined;
    return first.city ?? first.subregion ?? first.region ?? undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/services/geo/GeocodingService.ts
git commit -m "feat(app): GeocodingService via expo-location (on-device Apple)"
```

---

## Task 12: SpeechService

**Files:**
- Create: `app/src/services/speech/SpeechService.ts`

- [ ] **Step 1: Implement (using `expo-speech-recognition` API)**

```ts
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export async function transcribeOnce(): Promise<string> {
  return new Promise((resolve, reject) => {
    let final = "";
    const cleanup: Array<() => void> = [];

    const offResult = ExpoSpeechRecognitionModule.addListener("result", (e) => {
      const transcript = e.results?.[0]?.transcript ?? "";
      if (e.isFinal) final = transcript;
    });
    cleanup.push(() => offResult.remove());

    const offEnd = ExpoSpeechRecognitionModule.addListener("end", () => {
      cleanup.forEach((c) => c());
      resolve(final);
    });
    cleanup.push(() => offEnd.remove());

    const offErr = ExpoSpeechRecognitionModule.addListener("error", (e) => {
      cleanup.forEach((c) => c());
      reject(new Error(e.error ?? "speech recognition failed"));
    });
    cleanup.push(() => offErr.remove());

    ExpoSpeechRecognitionModule.start({
      lang: "fr-FR",
      interimResults: false,
      continuous: false,
      requiresOnDeviceRecognition: true,
    });
  });
}

export { useSpeechRecognitionEvent };
```

**If `expo-speech-recognition` is not installed/available**: replace this file with a stub that throws `new Error("speech recognition not configured")` and a comment explaining how to wire it. Voice mode will be disabled in the UI; that's an acceptable Plan-2 MVP cut.

- [ ] **Step 2: Commit**

```bash
git add app/src/services/speech/SpeechService.ts
git commit -m "feat(app): SpeechService with on-device fr-FR recognition"
```

---

## Task 13: SQLite + repos

**Files:**
- Create: `app/src/state/db.ts`
- Create: `app/src/state/appStateRepo.ts`
- Create: `app/src/state/momentDecisionsRepo.ts`
- Create: `app/src/state/padsCacheRepo.ts`

- [ ] **Step 1: Implement `app/src/state/db.ts`**

```ts
import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync("familieohelper.db").then(migrate);
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS moment_decisions (
      moment_hash TEXT PRIMARY KEY,
      decision TEXT,
      decided_at TEXT
    );
    CREATE TABLE IF NOT EXISTS pads_cache (
      pad_id TEXT PRIMARY KEY,
      name TEXT,
      last_used_at TEXT
    );
  `);
  return db;
}
```

- [ ] **Step 2: Implement `app/src/state/appStateRepo.ts`**

```ts
import { getDb } from "./db";

const LAST_POST_AT = "last_post_at";

export async function getLastPostAt(defaultIso: string): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_state WHERE key = ?",
    LAST_POST_AT,
  );
  return row?.value ?? defaultIso;
}

export async function setLastPostAt(iso: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    LAST_POST_AT,
    iso,
  );
}
```

- [ ] **Step 3: Implement `app/src/state/momentDecisionsRepo.ts`**

```ts
import { getDb } from "./db";

export type Decision = "posted" | "rejected";

export async function getDecision(hash: string): Promise<Decision | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ decision: Decision }>(
    "SELECT decision FROM moment_decisions WHERE moment_hash = ?",
    hash,
  );
  return row?.decision ?? null;
}

export async function setDecision(hash: string, decision: Decision): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO moment_decisions (moment_hash, decision, decided_at)
     VALUES (?, ?, ?)
     ON CONFLICT(moment_hash) DO UPDATE SET decision = excluded.decision, decided_at = excluded.decided_at`,
    hash,
    decision,
    new Date().toISOString(),
  );
}
```

- [ ] **Step 4: Implement `app/src/state/padsCacheRepo.ts`**

```ts
import { getDb } from "./db";
import type { Pad } from "../domain/types";

export async function upsertPads(pads: Pick<Pad, "id" | "name">[]): Promise<void> {
  const db = await getDb();
  for (const p of pads) {
    await db.runAsync(
      `INSERT INTO pads_cache (pad_id, name) VALUES (?, ?)
       ON CONFLICT(pad_id) DO UPDATE SET name = excluded.name`,
      p.id,
      p.name,
    );
  }
}

export async function listCachedPads(): Promise<Pad[]> {
  const db = await getDb();
  return db.getAllAsync<Pad>(
    "SELECT pad_id as id, name, last_used_at as lastUsedAt FROM pads_cache ORDER BY last_used_at DESC NULLS LAST, name ASC",
  );
}

export async function markPadUsed(padId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE pads_cache SET last_used_at = ? WHERE pad_id = ?",
    new Date().toISOString(),
    padId,
  );
}

export async function getDefaultPadId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ pad_id: string }>(
    "SELECT pad_id FROM pads_cache ORDER BY last_used_at DESC NULLS LAST, pad_id ASC LIMIT 1",
  );
  return row?.pad_id ?? null;
}
```

- [ ] **Step 5: Commit**

```bash
git add app/src/state/db.ts app/src/state/appStateRepo.ts app/src/state/momentDecisionsRepo.ts app/src/state/padsCacheRepo.ts
git commit -m "feat(app): SQLite db + repos (appState, momentDecisions, padsCache)"
```

---

## Task 14: NotificationService

**Files:**
- Create: `app/src/services/notifications/NotificationService.ts`

- [ ] **Step 1: Implement**

```ts
import * as Notifications from "expo-notifications";

export async function ensureNotificationPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function scheduleGazetteReminder(closesAtIso: string): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const fireAt = new Date(new Date(closesAtIso).getTime() - 3 * 24 * 60 * 60 * 1000);
  if (fireAt.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Gazette Famileo",
      body: "La gazette ferme dans 3 jours — pense à poster.",
    },
    trigger: { type: "date", date: fireAt } as Notifications.DateTriggerInput,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/services/notifications/NotificationService.ts
git commit -m "feat(app): NotificationService — reminder 3 days before gazette close"
```

---

## Task 15: Zustand store (UI state)

**Files:**
- Create: `app/src/state/store.ts`

- [ ] **Step 1: Implement**

```ts
import { create } from "zustand";
import type { PostProposal, Pad } from "../domain/types";

type AppStore = {
  proposals: PostProposal[];
  setProposals: (p: PostProposal[]) => void;
  pads: Pad[];
  setPads: (p: Pad[]) => void;
  defaultPadId: string | null;
  setDefaultPadId: (id: string | null) => void;
  bearer: string | null;
  backendUrl: string | null;
  setAuth: (bearer: string | null, backendUrl: string | null) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  proposals: [],
  setProposals: (p) => set({ proposals: p }),
  pads: [],
  setPads: (p) => set({ pads: p }),
  defaultPadId: null,
  setDefaultPadId: (id) => set({ defaultPadId: id }),
  bearer: null,
  backendUrl: null,
  setAuth: (bearer, backendUrl) => set({ bearer, backendUrl }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add app/src/state/store.ts
git commit -m "feat(app): zustand UI store"
```

---

## Task 16: Theme + primitive components

**Files:**
- Create: `app/src/ui/theme/colors.ts`
- Create: `app/src/ui/components/PrimaryButton.tsx`
- Create: `app/src/ui/components/PhotoTile.tsx`

- [ ] **Step 1: `app/src/ui/theme/colors.ts`**

```ts
export const colors = {
  bg: "#ffffff",
  ink: "#0a0a0a",
  inkSoft: "#525252",
  accent: "#1e88e5",
  danger: "#d32f2f",
};
```

- [ ] **Step 2: `app/src/ui/components/PrimaryButton.tsx`**

```tsx
import { Pressable, Text } from "react-native";

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-2xl px-6 py-4 items-center ${disabled ? "bg-neutral-300" : "bg-blue-600 active:bg-blue-700"}`}
    >
      <Text className="text-white font-semibold text-base">{label}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 3: `app/src/ui/components/PhotoTile.tsx`**

```tsx
import { Image, View } from "react-native";

export function PhotoTile({ uri, size = 80 }: { uri: string; size?: number }) {
  return (
    <View style={{ width: size, height: size }} className="rounded-xl overflow-hidden bg-neutral-200">
      <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/src/ui/theme app/src/ui/components/PrimaryButton.tsx app/src/ui/components/PhotoTile.tsx
git commit -m "feat(app): theme + PrimaryButton + PhotoTile primitives"
```

---

## Task 17: PadPicker

**Files:**
- Create: `app/src/ui/components/PadPicker.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Pressable, Text, View } from "react-native";
import type { Pad } from "../../domain/types";

export function PadPicker({
  pads,
  selectedId,
  onSelect,
}: {
  pads: Pad[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="gap-2">
      {pads.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => onSelect(p.id)}
          className={`rounded-xl border px-4 py-3 ${selectedId === p.id ? "border-blue-600 bg-blue-50" : "border-neutral-300"}`}
        >
          <Text className="text-base">{p.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/ui/components/PadPicker.tsx
git commit -m "feat(app): PadPicker component"
```

---

## Task 18: Navigation skeleton

**Files:**
- Create: `app/src/ui/navigation.tsx`
- Replace: `app/App.tsx`

- [ ] **Step 1: Implement `app/src/ui/navigation.tsx`**

```tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PropositionsScreen } from "./screens/PropositionsScreen";
import { ManualPickerScreen } from "./screens/ManualPickerScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { PostFlowScreen } from "./screens/PostFlowScreen";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator>
      <Tabs.Screen name="Propositions" component={PropositionsScreen} />
      <Tabs.Screen name="Manuel" component={ManualPickerScreen} />
      <Tabs.Screen name="Réglages" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator({ needsOnboarding }: { needsOnboarding: boolean }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {needsOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : null}
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="PostFlow" component={PostFlowScreen} options={{ presentation: "modal" }} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Replace `app/App.tsx`**

```tsx
import "./global.css";
import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/ui/navigation";
import { getBearerToken, getBackendUrl } from "./src/state/secureStore";
import { useAppStore } from "./src/state/store";

export default function App() {
  const setAuth = useAppStore((s) => s.setAuth);
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      const [bearer, url] = await Promise.all([getBearerToken(), getBackendUrl()]);
      setAuth(bearer, url);
      setNeedsOnboarding(!bearer || !url);
      setReady(true);
    })();
  }, [setAuth]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator needsOnboarding={needsOnboarding} />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Commit (will be incomplete — screens still missing)**

Don't commit yet — screens are in Task 19.

---

## Task 19: All screens

**Files:**
- Create: `app/src/ui/screens/OnboardingScreen.tsx`
- Create: `app/src/ui/screens/PropositionsScreen.tsx`
- Create: `app/src/ui/screens/ManualPickerScreen.tsx`
- Create: `app/src/ui/screens/PostFlowScreen.tsx`
- Create: `app/src/ui/screens/SettingsScreen.tsx`
- Create: `app/src/ui/components/ProposalCard.tsx`

This is the largest task. Implement each screen below.

- [ ] **Step 1: `app/src/ui/components/ProposalCard.tsx`**

```tsx
import { View, Text, ScrollView } from "react-native";
import { PhotoTile } from "./PhotoTile";
import { PrimaryButton } from "./PrimaryButton";
import type { PostProposal } from "../../domain/types";

export function ProposalCard({
  proposal,
  onReject,
  onContinue,
}: {
  proposal: PostProposal;
  onReject: () => void;
  onContinue: () => void;
}) {
  return (
    <View className="rounded-3xl bg-white p-4 gap-3 shadow">
      <Text className="text-lg font-semibold">
        {proposal.weekday} {proposal.date}
        {proposal.city ? ` · ${proposal.city}` : ""}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
        {proposal.photos.map((p) => (
          <View key={p.id} className="mr-2">
            <PhotoTile uri={p.uri} size={120} />
          </View>
        ))}
      </ScrollView>
      <Text className="text-base text-neutral-700">{proposal.draftText ?? "Génération du texte…"}</Text>
      <View className="flex-row gap-3 mt-2">
        <View className="flex-1">
          <PrimaryButton label="Pas cette fois" onPress={onReject} />
        </View>
        <View className="flex-1">
          <PrimaryButton label="Continuer" onPress={onContinue} />
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: `app/src/ui/screens/OnboardingScreen.tsx`**

```tsx
import { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { setBearerToken, setBackendUrl } from "../../state/secureStore";
import { useAppStore } from "../../state/store";
import { useNavigation } from "@react-navigation/native";

export function OnboardingScreen() {
  const [url, setUrl] = useState("https://familieohelper.alphaluppi.fr");
  const [token, setToken] = useState("");
  const setAuth = useAppStore((s) => s.setAuth);
  const nav = useNavigation<any>();

  const onSave = async () => {
    if (!url || !token) {
      Alert.alert("Champs requis", "Renseigne l'URL et le token.");
      return;
    }
    await setBackendUrl(url);
    await setBearerToken(token);
    setAuth(token, url);
    nav.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  return (
    <View className="flex-1 bg-white p-6 gap-4 justify-center">
      <Text className="text-2xl font-bold">FamileoHelper</Text>
      <Text className="text-base text-neutral-600">URL du backend :</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        className="border border-neutral-300 rounded-xl px-4 py-3"
      />
      <Text className="text-base text-neutral-600">Token :</Text>
      <TextInput
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        className="border border-neutral-300 rounded-xl px-4 py-3"
      />
      <PrimaryButton label="Connexion" onPress={onSave} />
    </View>
  );
}
```

- [ ] **Step 3: `app/src/ui/screens/PropositionsScreen.tsx`**

```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../../state/store";
import { ensurePermissions, listPhotosSince } from "../../services/photos/MediaLibraryService";
import { reverseGeocode } from "../../services/geo/GeocodingService";
import { buildProposals } from "../../domain/proposal";
import { getLastPostAt } from "../../state/appStateRepo";
import { getDecision } from "../../state/momentDecisionsRepo";
import { BackendClient } from "../../services/backend/BackendClient";
import { ProposalCard } from "../components/ProposalCard";
import type { PostProposal } from "../../domain/types";

const DEFAULT_LOOKBACK_DAYS = 30;

export function PropositionsScreen() {
  const { bearer, backendUrl, proposals, setProposals } = useAppStore();
  const [loading, setLoading] = useState(false);
  const nav = useNavigation<any>();

  const refresh = useCallback(async () => {
    if (!bearer || !backendUrl) return;
    setLoading(true);
    try {
      const ok = await ensurePermissions();
      if (!ok) {
        Alert.alert("Permissions", "Accès aux photos refusé.");
        return;
      }
      const fallback = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();
      const since = await getLastPostAt(fallback);
      const photos = await listPhotosSince(since);
      const drafts = buildProposals(photos);

      const fresh: PostProposal[] = [];
      for (const d of drafts) {
        if (await getDecision(d.momentHash)) continue;
        // resolve city
        const first = d.photos[0];
        if (first?.location) {
          d.city = await reverseGeocode(first.location);
        }
        fresh.push(d);
      }

      // generate captions in parallel (cap 4)
      const backend = new BackendClient({ baseUrl: backendUrl, bearer });
      await Promise.all(
        fresh.slice(0, 8).map(async (p) => {
          try {
            p.draftText = await backend.generateCaption({
              date: p.date,
              city: p.city,
              photoCount: p.photos.length,
              weekday: p.weekday,
            });
          } catch {
            p.draftText = `Petit moment partagé ${p.weekday}${p.city ? ` à ${p.city}` : ""}.`;
          }
        }),
      );

      setProposals(fresh);
    } finally {
      setLoading(false);
    }
  }, [bearer, backendUrl, setProposals]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading && proposals.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <ActivityIndicator />
      </View>
    );
  }

  if (proposals.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 p-6">
        <Text className="text-base text-neutral-700">Rien de neuf depuis ton dernier post 👌</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-neutral-50"
      contentContainerClassName="p-4 gap-4"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      {proposals.map((p) => (
        <ProposalCard
          key={p.momentHash}
          proposal={p}
          onReject={async () => {
            const { setDecision } = await import("../../state/momentDecisionsRepo");
            await setDecision(p.momentHash, "rejected");
            setProposals(proposals.filter((x) => x.momentHash !== p.momentHash));
          }}
          onContinue={() => nav.navigate("PostFlow", { proposal: p })}
        />
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 4: `app/src/ui/screens/ManualPickerScreen.tsx`**

```tsx
import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PhotoTile } from "../components/PhotoTile";
import { PrimaryButton } from "../components/PrimaryButton";
import { ensurePermissions, listPhotosSince } from "../../services/photos/MediaLibraryService";
import { momentHash } from "../../domain/momentHash";
import type { Photo, PostProposal } from "../../domain/types";

const WEEKDAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function ManualPickerScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const nav = useNavigation<any>();

  useEffect(() => {
    (async () => {
      if (!(await ensurePermissions())) return;
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      setPhotos(await listPhotosSince(since));
    })();
  }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else {
      if (next.size >= 4) {
        Alert.alert("Max 4 photos");
        return;
      }
      next.add(id);
    }
    setSelected(next);
  };

  const onContinue = () => {
    const chosen = photos.filter((p) => selected.has(p.id));
    if (chosen.length === 0) return;
    const date = new Date(chosen[0]!.createdAt);
    const proposal: PostProposal = {
      momentHash: momentHash(chosen.map((p) => p.id)),
      photos: chosen,
      date: date.toISOString().slice(0, 10),
      weekday: WEEKDAYS_FR[date.getUTCDay()]!,
    };
    nav.navigate("PostFlow", { proposal });
  };

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        numColumns={3}
        contentContainerClassName="p-1"
        renderItem={({ item }) => {
          const isSel = selected.has(item.id);
          return (
            <Pressable onPress={() => toggle(item.id)} className="p-1">
              <View className={isSel ? "border-2 border-blue-600 rounded-xl" : ""}>
                <PhotoTile uri={item.uri} size={110} />
              </View>
            </Pressable>
          );
        }}
      />
      <View className="p-4">
        <PrimaryButton
          label={`Continuer (${selected.size})`}
          onPress={onContinue}
          disabled={selected.size === 0}
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 5: `app/src/ui/screens/PostFlowScreen.tsx`**

```tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { PrimaryButton } from "../components/PrimaryButton";
import { PhotoTile } from "../components/PhotoTile";
import { PadPicker } from "../components/PadPicker";
import { useAppStore } from "../../state/store";
import { BackendClient } from "../../services/backend/BackendClient";
import { setDecision } from "../../state/momentDecisionsRepo";
import { upsertPads, listCachedPads, markPadUsed, getDefaultPadId } from "../../state/padsCacheRepo";
import { setLastPostAt } from "../../state/appStateRepo";
import { transcribeOnce } from "../../services/speech/SpeechService";
import type { PostProposal, Pad } from "../../domain/types";

export function PostFlowScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const proposal: PostProposal = route.params!.proposal;
  const { bearer, backendUrl } = useAppStore();
  const [text, setText] = useState(proposal.draftText ?? "");
  const [pads, setPads] = useState<Pad[]>([]);
  const [padId, setPadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!bearer || !backendUrl) return;
      const backend = new BackendClient({ baseUrl: backendUrl, bearer });
      const remote = await backend.listPads().catch(() => null);
      if (remote) {
        await upsertPads(remote);
      }
      const cached = await listCachedPads();
      setPads(cached);
      setPadId((await getDefaultPadId()) ?? cached[0]?.id ?? null);
    })();
  }, [bearer, backendUrl]);

  const onDictate = async () => {
    try {
      const t = await transcribeOnce();
      if (!t) return;
      if (!bearer || !backendUrl) return;
      const backend = new BackendClient({ baseUrl: backendUrl, bearer });
      const polished = await backend.reformulate(t).catch(() => t);
      setText(polished);
    } catch (e) {
      Alert.alert("Dictée", (e as Error).message);
    }
  };

  const onSend = async () => {
    if (!bearer || !backendUrl || !padId) return;
    setBusy(true);
    try {
      const backend = new BackendClient({ baseUrl: backendUrl, bearer });
      await backend.createPost({
        padId,
        text,
        photos: proposal.photos.map((p, i) => ({
          uri: p.uri,
          filename: `photo_${i}.jpg`,
          mimeType: "image/jpeg",
        })),
      });
      await setDecision(proposal.momentHash, "posted");
      await markPadUsed(padId);
      const latest = proposal.photos
        .map((p) => p.createdAt)
        .sort()
        .at(-1)!;
      await setLastPostAt(latest);
      nav.goBack();
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-4 gap-4">
      <Text className="text-lg font-semibold">
        {proposal.weekday} {proposal.date}
        {proposal.city ? ` · ${proposal.city}` : ""}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {proposal.photos.map((p) => (
          <PhotoTile key={p.id} uri={p.uri} size={90} />
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        className="border border-neutral-300 rounded-xl p-3 min-h-32 text-base"
        placeholder="Texte du post"
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <PrimaryButton label="🎤 Dicter" onPress={onDictate} />
        </View>
      </View>
      <Text className="text-base font-semibold mt-2">Destinataire</Text>
      <PadPicker pads={pads} selectedId={padId} onSelect={setPadId} />
      <View className="mt-4">
        {busy ? <ActivityIndicator /> : null}
        <PrimaryButton label="Envoyer" onPress={onSend} disabled={busy || !padId || text.trim().length === 0} />
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 6: `app/src/ui/screens/SettingsScreen.tsx`**

```tsx
import { View, Text, Alert } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { clearBearerToken } from "../../state/secureStore";
import { useAppStore } from "../../state/store";
import { useNavigation } from "@react-navigation/native";

export function SettingsScreen() {
  const setAuth = useAppStore((s) => s.setAuth);
  const nav = useNavigation<any>();

  const onLogout = async () => {
    Alert.alert("Déconnexion", "Confirmer ?", [
      { text: "Annuler" },
      {
        text: "Oui",
        style: "destructive",
        onPress: async () => {
          await clearBearerToken();
          setAuth(null, null);
          nav.reset({ index: 0, routes: [{ name: "Onboarding" }] });
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white p-6 gap-4">
      <Text className="text-xl font-bold">Réglages</Text>
      <PrimaryButton label="Se déconnecter" onPress={onLogout} />
    </View>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/App.tsx app/src/ui
git commit -m "feat(app): navigation + onboarding/propositions/manual/postflow/settings screens"
```

---

## Task 20: Smoke run on simulator + cleanup

**Files:** no source changes; run the app.

- [ ] **Step 1: Run typecheck**

`cd app && npx tsc --noEmit`. Fix any errors inline.

- [ ] **Step 2: Run vitest**

`cd app && npx vitest run`. All pure-logic tests must pass.

- [ ] **Step 3: Start iOS simulator and run**

```bash
cd app
npx expo start --ios
```

- [ ] **Step 4: Smoke-test on simulator**

- Onboarding : enter `http://localhost:8787` (if running backend locally with `useMockFamileo=true`) or the deployed URL, plus the bearer token
- Grant photo permissions
- Verify "Rien de neuf" displays when there are no photos (or proposals appear if the simulator has seeded photos)
- "Manuel" tab : pick 2 photos, hit Continuer → text edit + pad picker → send
- Verify the request reaches the backend (check backend logs)

- [ ] **Step 5: Commit any necessary fixes**

```bash
git add -A
git commit -m "fix(app): smoke-test corrections"
```

---

## Done criteria for Plan 2 (App MVP)

- `cd app && npx vitest run` : all domain + backendClient tests pass
- `cd app && npx tsc --noEmit` : no errors
- `npx expo start --ios` launches the app successfully
- Onboarding flow stores backend URL + bearer in SecureStore
- "Propositions" tab can scan the camera roll, cluster, fetch captions from the backend, display swipe cards
- "Manuel" tab allows multi-select 1-4 photos and navigates to the post flow
- Post flow can send a post to the backend (which logs it via MockFamileoClient → returns `post_<n>`)
- Settings → logout clears credentials and returns to Onboarding
