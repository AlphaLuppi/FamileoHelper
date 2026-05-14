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
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0 Safari/537.36";

export class FamileoSessionError extends Error {
  constructor(msg = "famileo session missing or expired") {
    super(msg);
    this.name = "FamileoSessionError";
  }
}

type PadRow = {
  pad_id: number;
  pad_name?: string;
  pad_firstname?: string;
  pad_lastname?: string;
  next_gazette_tz?: string;
  next_gazette?: string;
};

type PresignedResponse = {
  type: string;
  url: string;
  form: {
    attributes: { action: string; method: string; enctype: string };
    inputs: Record<string, string>;
  };
};

type CreatePostResponse = {
  code: number;
  familyPost?: {
    wall_post_id: number;
    date_tz?: string;
    date?: string;
  };
  errorPosts?: unknown[];
};

export class WebApiFamileoClient implements FamileoClient {
  constructor(private readonly sessions: SessionStore) {}

  async ensureSession(userId: number): Promise<void> {
    const s = this.sessions.load(userId);
    if (!s || !s.cookies.trim()) {
      throw new FamileoSessionError(
        "no famileo session — POST /famileo/session with cookies",
      );
    }
  }

  async listPads(userId: number): Promise<Pad[]> {
    const rows = await this.fetchPads(userId);
    return rows.map((r) => ({
      id: String(r.pad_id),
      name:
        r.pad_name?.trim() ||
        [r.pad_firstname, r.pad_lastname].filter(Boolean).join(" ").trim() ||
        `Pad ${r.pad_id}`,
    }));
  }

  async listGazettes(userId: number, padId: string): Promise<Gazette[]> {
    const rows = await this.fetchPads(userId);
    const row = rows.find((r) => String(r.pad_id) === padId);
    if (!row) throw new Error(`unknown pad: ${padId}`);
    const next = row.next_gazette_tz ?? row.next_gazette;
    if (!next) return [];
    return [
      {
        id: `next_${padId}`,
        padId,
        closesAt: new Date(next).toISOString(),
      },
    ];
  }

  async createPost(userId: number, input: PostInput): Promise<PostResult> {
    if (input.photos.length === 0) throw new Error("at least one photo required");

    let last: PostResult | null = null;
    for (const photo of input.photos) {
      const presigned = await this.getPresignedUrl(userId);
      const key = await this.uploadPhotoToS3(presigned, photo);
      last = await this.postFamily(userId, input.padId, input.text, key);
    }
    if (!last) throw new Error("post failed");
    return last;
  }

  // ---- internals ----------------------------------------------------------

  private cookieHeader(userId: number): string {
    const s = this.sessions.load(userId);
    if (!s) throw new FamileoSessionError();
    return s.cookies;
  }

  private commonHeaders(userId: number): Record<string, string> {
    return {
      accept: "application/json, text/plain, */*",
      "user-agent": USER_AGENT,
      cookie: this.cookieHeader(userId),
      referer: `${BASE}/web-family/`,
      origin: BASE,
    };
  }

  private async fetchPads(userId: number): Promise<PadRow[]> {
    const res = await request(
      `${BASE}/api/user/pad?include_subscription_when_no_manager=true`,
      { method: "GET", headers: this.commonHeaders(userId) },
    );
    if (res.statusCode === 401 || res.statusCode === 403) {
      throw new FamileoSessionError(`famileo /api/user/pad ${res.statusCode}`);
    }
    if (res.statusCode >= 400) {
      const body = await res.body.text();
      throw new Error(`famileo /api/user/pad ${res.statusCode}: ${body.slice(0, 200)}`);
    }
    const json = (await res.body.json()) as { code: number; pads?: PadRow[] };
    return json.pads ?? [];
  }

  private async getPresignedUrl(userId: number): Promise<PresignedResponse> {
    const res = await request(`${BASE}/api/v1/presigned_urls`, {
      method: "POST",
      headers: { ...this.commonHeaders(userId), "content-type": "application/json" },
      body: JSON.stringify({ type: "post.image" }),
    });
    if (res.statusCode === 401 || res.statusCode === 403) {
      throw new FamileoSessionError(`presigned_urls ${res.statusCode}`);
    }
    if (res.statusCode >= 400) {
      const body = await res.body.text();
      throw new Error(`presigned_urls ${res.statusCode}: ${body.slice(0, 300)}`);
    }
    return (await res.body.json()) as PresignedResponse;
  }

  private async uploadPhotoToS3(
    presigned: PresignedResponse,
    photo: PhotoUpload,
  ): Promise<string> {
    const form = new FormData();
    for (const [k, v] of Object.entries(presigned.form.inputs)) {
      form.set(k, v);
    }
    form.set("Content-Type", photo.contentType || "image/jpeg");
    form.set("X-Amz-Meta-Filename", photo.filename || "photo.jpg");
    form.set(
      "file",
      new Blob([photo.bytes], { type: photo.contentType || "image/jpeg" }),
      photo.filename || "photo.jpg",
    );

    const res = await request(presigned.form.attributes.action, {
      method: "POST",
      body: form,
    });
    if (res.statusCode >= 300) {
      const body = await res.body.text();
      throw new Error(`S3 upload ${res.statusCode}: ${body.slice(0, 200)}`);
    }
    await res.body.dump();
    return presigned.form.inputs.key!;
  }

  private async postFamily(
    userId: number,
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
      { method: "POST", headers: this.commonHeaders(userId), body: form },
    );
    if (res.statusCode === 401 || res.statusCode === 403) {
      throw new FamileoSessionError(`posts ${res.statusCode}`);
    }
    if (res.statusCode >= 400) {
      const body = await res.body.text();
      throw new Error(`posts ${res.statusCode}: ${body.slice(0, 400)}`);
    }
    const json = (await res.body.json()) as CreatePostResponse;
    const fp = json.familyPost;
    if (!fp?.wall_post_id) {
      throw new Error(`posts: missing wall_post_id (response code=${json.code})`);
    }
    return {
      postId: String(fp.wall_post_id),
      padId,
      postedAt: fp.date_tz || fp.date || new Date().toISOString(),
    };
  }
}
