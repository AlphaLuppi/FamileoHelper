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
