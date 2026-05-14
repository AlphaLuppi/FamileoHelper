import { FormData, request } from "undici";
import type { FamileoClient } from "./FamileoClient.js";
import type {
  Gazette,
  Pad,
  PhotoUpload,
  PostInput,
  PostResult,
} from "./types.js";
import type { SessionStore } from "./sessionStore.js";

const BASE = "https://www.famileo.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export class FamileoSessionError extends Error {
  constructor(msg = "famileo session missing or expired") {
    super(msg);
    this.name = "FamileoSessionError";
  }
}

type RawPad = {
  family_id?: number | string;
  id?: number | string;
  name?: string;
  family_name?: string;
};

type RawGazette = {
  id: number | string;
  closing_date?: string;
  close_date?: string;
  closing_at?: string;
  closesAt?: string;
  publication_date?: string;
  published_at?: string;
};

type PresignedResponse =
  | { url: string; key: string; fields?: Record<string, string> }
  | { urls: Array<{ url: string; key: string }> }
  | { presigned_urls: Array<{ url: string; key: string }> }
  | Record<string, unknown>;

export class WebApiFamileoClient implements FamileoClient {
  constructor(private readonly sessions: SessionStore) {}

  async ensureSession(): Promise<void> {
    const s = this.sessions.load();
    if (!s || !s.cookies.trim()) {
      throw new FamileoSessionError(
        "no famileo session — POST /admin/famileo-session with cookies",
      );
    }
  }

  async listPads(): Promise<Pad[]> {
    const data = await this.apiGet<unknown>("/api/user/pad");
    const rows = extractArray(data);
    return rows.map((r) => normalizePad(r as RawPad)).filter(Boolean) as Pad[];
  }

  async listGazettes(padId: string): Promise<Gazette[]> {
    const data = await this.apiGet<unknown>(`/api/gazettes/${encodeURIComponent(padId)}`);
    const rows = extractArray(data);
    return rows
      .map((r) => normalizeGazette(r as RawGazette, padId))
      .filter(Boolean) as Gazette[];
  }

  async createPost(input: PostInput): Promise<PostResult> {
    if (input.photos.length === 0) throw new Error("at least one photo required");

    let lastResult: PostResult | null = null;
    for (const photo of input.photos) {
      const { url, key } = await this.getPresignedUrl(input.padId);
      await this.uploadPhoto(url, photo);
      const created = await this.postFamily(input.padId, input.text, key);
      lastResult = created;
    }
    if (!lastResult) throw new Error("post failed");
    return lastResult;
  }

  // ---- internals ----------------------------------------------------------

  private cookieHeader(): string {
    const s = this.sessions.load();
    if (!s) throw new FamileoSessionError();
    return s.cookies;
  }

  private async apiGet<T>(path: string): Promise<T> {
    const res = await request(`${BASE}${path}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
        cookie: this.cookieHeader(),
        referer: `${BASE}/`,
      },
    });
    if (res.statusCode === 401 || res.statusCode === 403) {
      throw new FamileoSessionError(`famileo ${path} ${res.statusCode}`);
    }
    if (res.statusCode >= 400) {
      const body = await res.body.text();
      throw new Error(`famileo ${path} ${res.statusCode}: ${body.slice(0, 200)}`);
    }
    return (await res.body.json()) as T;
  }

  private async getPresignedUrl(
    padId: string,
  ): Promise<{ url: string; key: string }> {
    const data = await this.apiGet<PresignedResponse>(
      `/api/families/${encodeURIComponent(padId)}/presigned_urls`,
    );
    return normalizePresigned(data);
  }

  private async uploadPhoto(url: string, photo: PhotoUpload): Promise<void> {
    const res = await request(url, {
      method: "PUT",
      headers: {
        "content-type": photo.contentType || "image/jpeg",
      },
      body: photo.bytes,
    });
    if (res.statusCode >= 300) {
      const body = await res.body.text();
      throw new Error(`S3 PUT ${res.statusCode}: ${body.slice(0, 200)}`);
    }
    await res.body.dump();
  }

  private async postFamily(
    padId: string,
    text: string,
    imageKey: string,
  ): Promise<PostResult> {
    const form = new FormData();
    form.set("text", text);
    form.set("is_private", "0");
    form.set("is_full_page", "0");
    form.set("published_at", new Date().toISOString());
    form.set("image", imageKey);

    const res = await request(
      `${BASE}/api/families/${encodeURIComponent(padId)}/posts?return_validation_errors=1`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "user-agent": USER_AGENT,
          cookie: this.cookieHeader(),
          referer: `${BASE}/`,
        },
        body: form,
      },
    );
    if (res.statusCode === 401 || res.statusCode === 403) {
      throw new FamileoSessionError(`famileo post ${res.statusCode}`);
    }
    if (res.statusCode >= 400) {
      const body = await res.body.text();
      throw new Error(`famileo post ${res.statusCode}: ${body.slice(0, 300)}`);
    }
    const json = (await res.body.json()) as {
      familyPost?: { wall_post_id?: number | string; date_tz?: string; date?: string };
    };
    const post = json.familyPost;
    if (!post?.wall_post_id) {
      throw new Error("famileo post: missing wall_post_id");
    }
    return {
      postId: String(post.wall_post_id),
      padId,
      postedAt: post.date_tz || post.date || new Date().toISOString(),
    };
  }
}

// ---- helpers --------------------------------------------------------------

function extractArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") {
    for (const k of ["data", "pads", "families", "gazettes", "items"]) {
      const inner = (v as Record<string, unknown>)[k];
      if (Array.isArray(inner)) return inner;
    }
  }
  return [];
}

function normalizePad(r: RawPad): Pad | null {
  const id = r.family_id ?? r.id;
  if (id === undefined || id === null) return null;
  const name = r.family_name ?? r.name ?? `Pad ${id}`;
  return { id: String(id), name };
}

function normalizeGazette(r: RawGazette, padId: string): Gazette | null {
  if (r.id === undefined) return null;
  const closesAt =
    r.closing_date ?? r.close_date ?? r.closing_at ?? r.closesAt ?? "";
  if (!closesAt) return null;
  return {
    id: String(r.id),
    padId,
    closesAt: new Date(closesAt).toISOString(),
    publishedAt: r.publication_date ?? r.published_at,
  };
}

function normalizePresigned(data: PresignedResponse): { url: string; key: string } {
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    if (typeof d.url === "string" && typeof d.key === "string") {
      return { url: d.url, key: d.key };
    }
    const arr = (d.urls ?? d.presigned_urls) as
      | Array<{ url: string; key: string }>
      | undefined;
    if (Array.isArray(arr) && arr[0]?.url && arr[0]?.key) {
      return { url: arr[0].url, key: arr[0].key };
    }
  }
  throw new Error(`unexpected presigned response: ${JSON.stringify(data).slice(0, 200)}`);
}
