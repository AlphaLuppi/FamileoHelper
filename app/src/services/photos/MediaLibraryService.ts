import * as MediaLibrary from "expo-media-library";
import type { Photo } from "../../domain/types";

export async function ensurePermissions(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === "granted";
}

export async function listPhotosSince(sinceIso: string): Promise<Photo[]> {
  const since = new Date(sinceIso).getTime();
  const photos: Photo[] = [];
  let after: string | undefined;
  for (let i = 0; i < 10; i++) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: "photo",
      sortBy: [["creationTime", false]],
      first: 100,
      after,
    });
    for (const asset of page.assets) {
      if (asset.creationTime <= since) {
        return photos;
      }
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      photos.push({
        id: asset.id,
        uri: info.localUri ?? asset.uri,
        createdAt: new Date(asset.creationTime).toISOString(),
        width: asset.width,
        height: asset.height,
        location: info.location
          ? { latitude: info.location.latitude, longitude: info.location.longitude }
          : undefined,
      });
    }
    if (!page.hasNextPage) break;
    after = page.endCursor;
  }
  return photos;
}
