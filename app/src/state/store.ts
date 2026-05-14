import { create } from "zustand";
import type { PostProposal, Pad } from "../domain/types";

export type AuthUser = {
  id: number;
  email: string;
};

type AppStore = {
  proposals: PostProposal[];
  setProposals: (p: PostProposal[]) => void;
  pads: Pad[];
  setPads: (p: Pad[]) => void;
  defaultPadId: string | null;
  setDefaultPadId: (id: string | null) => void;

  /** JWT (stored in secureStore as well). */
  bearer: string | null;
  backendUrl: string | null;
  setAuth: (bearer: string | null, backendUrl: string | null) => void;

  /** Logged-in user (null = anonymous). */
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;

  /** Whether the user has uploaded their Famileo cookies. */
  hasFamileoSession: boolean;
  setHasFamileoSession: (v: boolean) => void;
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
  user: null,
  setUser: (u) => set({ user: u }),
  hasFamileoSession: false,
  setHasFamileoSession: (v) => set({ hasFamileoSession: v }),
}));
