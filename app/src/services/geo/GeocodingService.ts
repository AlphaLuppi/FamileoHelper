import * as Location from "expo-location";

export type LatLng = { latitude: number; longitude: number };

export async function reverseGeocode(point: LatLng): Promise<string | undefined> {
  try {
    const results = await Location.reverseGeocodeAsync(point);
    const first = results[0];
    if (!first) return undefined;
    return first.city ?? first.subregion ?? first.region ?? undefined;
  } catch {
    return undefined;
  }
}
