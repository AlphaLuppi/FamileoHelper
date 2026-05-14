import type { Moment, Photo } from "./types";
const MAX = 4;
export function selectPhotos(moment: Moment): Photo[] {
  if (moment.photos.length <= MAX) return [...moment.photos];
  const ranked = [...moment.photos].sort((a, b) => b.width * b.height - a.width * a.height);
  const top = ranked.slice(0, MAX);
  return top.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
