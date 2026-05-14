import type { Pad, Gazette, PostInput, PostResult } from "./types.js";

export interface FamileoClient {
  /** Ensure a valid session exists for the given user. */
  ensureSession(userId: number): Promise<void>;
  listPads(userId: number): Promise<Pad[]>;
  listGazettes(userId: number, padId: string): Promise<Gazette[]>;
  createPost(userId: number, input: PostInput): Promise<PostResult>;
}
