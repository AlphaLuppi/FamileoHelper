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
