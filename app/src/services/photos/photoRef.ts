import type { Photo } from "../../domain/types";
import type { PhotoRef } from "../backend/BackendClient";

export function photoToPhotoRef(photo: Photo, index: number): PhotoRef {
  return {
    uri: photo.uri,
    filename: `photo_${index}.jpg`,
    mimeType: "image/jpeg",
  };
}

// Sur web on garde une référence au File ; sur natif c'est un no-op.
export function registerPhotoFile(_id: string, _file: unknown): void {}
