import type { Pad, Gazette, PostInput, PostResult } from "./types.js";

export interface FamileoClient {
  /** Ensure a valid session exists. Re-logs in if expired. */
  ensureSession(): Promise<void>;
  listPads(): Promise<Pad[]>;
  listGazettes(padId: string): Promise<Gazette[]>;
  createPost(input: PostInput): Promise<PostResult>;
}
