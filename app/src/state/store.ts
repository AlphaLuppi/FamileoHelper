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
