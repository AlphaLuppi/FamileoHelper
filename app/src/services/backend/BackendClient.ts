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
  // Sur web on attache le Blob/File directement ; sur RN on garde {uri,name,type}.
  blob?: Blob;
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

export type AuthUser = {
  id: number;
  email: string;
};

export type AuthResult = {
  token: string;
  user: AuthUser;
};

export type MeResult = {
  user: AuthUser;
  hasFamileoSession: boolean;
};

type Fetcher = typeof fetch;

export type BackendClientOptions = {
  baseUrl: string;
  bearer: string | null;
  fetcher?: Fetcher;
  /** Called when the backend returns 401, so the UI can log the user out. */
  onUnauthorized?: () => void;
};

export class BackendError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "BackendError";
  }
}

export class BackendClient {
  private baseUrl: string;
  private bearer: string | null;
  private fetcher: Fetcher;
  private onUnauthorized?: () => void;

  constructor(opts: BackendClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.bearer = opts.bearer;
    this.fetcher = opts.fetcher ?? fetch;
    this.onUnauthorized = opts.onUnauthorized;
  }

  setBearer(token: string | null) {
    this.bearer = token;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    opts: { auth?: boolean } = { auth: true },
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined),
    };
    if (opts.auth !== false && this.bearer) {
      headers.authorization = `Bearer ${this.bearer}`;
    }
    const res = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers });
    if (res.status === 401 && opts.auth !== false) {
      this.onUnauthorized?.();
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let msg = body || res.statusText;
      try {
        const j = JSON.parse(body) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* not json */
      }
      throw new BackendError(res.status, msg);
    }
    return (await res.json()) as T;
  }

  // ---- auth ---------------------------------------------------------------

  async register(email: string, password: string, inviteCode: string): Promise<AuthResult> {
    return this.request<AuthResult>(
      "/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, inviteCode }),
      },
      { auth: false },
    );
  }

  async login(email: string, password: string): Promise<AuthResult> {
    return this.request<AuthResult>(
      "/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
      { auth: false },
    );
  }

  async me(): Promise<MeResult> {
    return this.request<MeResult>("/auth/me");
  }

  async setFamileoCookies(cookies: string): Promise<void> {
    await this.request<{ ok: true }>("/famileo/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cookies }),
    });
  }

  async getFamileoSessionStatus(): Promise<{ present: boolean }> {
    return this.request<{ present: boolean }>("/famileo/session");
  }

  // ---- famileo-facing -----------------------------------------------------

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
      if (p.blob) {
        fd.append("photos", p.blob, p.filename);
      } else {
        // React Native FormData accepts { uri, name, type }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fd.append("photos", { uri: p.uri, name: p.filename, type: p.mimeType } as any);
      }
    }
    return this.request<CreatePostResult>("/post", {
      method: "POST",
      body: fd as unknown as BodyInit,
    });
  }
}
