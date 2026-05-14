import type { Photo } from "../../domain/types";
import type { PhotoRef } from "../backend/BackendClient";

const fileById = new Map<string, File>();

export function registerPhotoFile(id: string, file: File): void {
  fileById.set(id, file);
}

export function photoToPhotoRef(photo: Photo, index: number): PhotoRef {
  const file = fileById.get(photo.id);
  if (!file) {
    return { uri: photo.uri, filename: `photo_${index}.jpg`, mimeType: "image/jpeg" };
  }
  return {
    uri: photo.uri,
    filename: file.name || `photo_${index}.jpg`,
    mimeType: file.type || "image/jpeg",
    blob: file,
  };
}
