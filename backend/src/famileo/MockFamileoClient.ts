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
