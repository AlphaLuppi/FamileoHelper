import type { Photo, Moment } from "./types";

const TIME_GAP_MS = 4 * 60 * 60 * 1000;
const DISTANCE_THRESHOLD_M = 500;
const EARTH_RADIUS_M = 6_371_000;

function haversine(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function centroid(photos: Photo[]) {
  const located = photos.filter((p) => p.location);
  if (located.length === 0) return undefined;
  const sum = located.reduce(
    (acc, p) => ({
      latitude: acc.latitude + p.location!.latitude,
      longitude: acc.longitude + p.location!.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return { latitude: sum.latitude / located.length, longitude: sum.longitude / located.length };
}

export function clusterMoments(photos: Photo[]): Moment[] {
  if (photos.length === 0) return [];
  const sorted = [...photos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const moments: Moment[] = [];
  let current: Photo[] = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1]!;
    const next = sorted[i]!;
    const timeGap = new Date(next.createdAt).getTime() - new Date(prev.createdAt).getTime();
    let sameCluster = timeGap <= TIME_GAP_MS;
    if (sameCluster && prev.location && next.location) {
      const dist = haversine(prev.location, next.location);
      if (dist > DISTANCE_THRESHOLD_M) sameCluster = false;
    }
    if (sameCluster) current.push(next);
    else {
      moments.push(makeMoment(current));
      current = [next];
    }
  }
  moments.push(makeMoment(current));
  return moments;
}

function makeMoment(photos: Photo[]): Moment {
  return {
    photos,
    startAt: photos[0]!.createdAt,
    endAt: photos[photos.length - 1]!.createdAt,
    centroid: centroid(photos),
  };
}
