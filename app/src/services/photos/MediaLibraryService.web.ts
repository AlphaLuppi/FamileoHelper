import type { Photo } from "../../domain/types";

export async function ensurePermissions(): Promise<boolean> {
  // Le navigateur gère l'autorisation au moment du picker. Rien à demander à l'avance.
  return true;
}

// Sur web on ne peut pas scanner la photothèque sans geste utilisateur.
// Le scan automatique renvoie [] ; l'UI doit utiliser pickPhotosFromFiles().
export async function listPhotosSince(_sinceIso: string): Promise<Photo[]> {
  return [];
}

type ExifGps = { latitude: number; longitude: number };
type ExifData = { takenAt?: Date; gps?: ExifGps };

function rationalToFloat(part: DataView, offset: number, littleEndian: boolean): number {
  const numerator = part.getUint32(offset, littleEndian);
  const denominator = part.getUint32(offset + 4, littleEndian);
  return denominator === 0 ? 0 : numerator / denominator;
}

function parseExif(buf: ArrayBuffer): ExifData {
  const view = new DataView(buf);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return {};

  let offset = 2;
  while (offset < view.byteLength - 4) {
    if (view.getUint16(offset) !== 0xffe1) {
      if ((view.getUint16(offset) & 0xff00) !== 0xff00) return {};
      const segSize = view.getUint16(offset + 2);
      offset += 2 + segSize;
      continue;
    }
    // APP1 marker - check Exif header
    if (
      view.getUint32(offset + 4) !== 0x45786966 || // "Exif"
      view.getUint16(offset + 8) !== 0x0000
    ) {
      return {};
    }
    const tiffStart = offset + 10;
    const byteOrder = view.getUint16(tiffStart);
    const littleEndian = byteOrder === 0x4949;
    const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
    return readIfd(view, tiffStart, tiffStart + ifd0Offset, littleEndian);
  }
  return {};
}

function readIfd(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  le: boolean,
): ExifData {
  const out: ExifData = {};
  if (ifdOffset >= view.byteLength) return out;
  const count = view.getUint16(ifdOffset, le);
  let exifIfdOffset: number | null = null;
  let gpsIfdOffset: number | null = null;

  for (let i = 0; i < count; i++) {
    const entry = ifdOffset + 2 + i * 12;
    if (entry + 12 > view.byteLength) break;
    const tag = view.getUint16(entry, le);
    if (tag === 0x8769) exifIfdOffset = view.getUint32(entry + 8, le);
    if (tag === 0x8825) gpsIfdOffset = view.getUint32(entry + 8, le);
  }

  if (exifIfdOffset != null) {
    const dt = readDateTimeOriginal(view, tiffStart, tiffStart + exifIfdOffset, le);
    if (dt) out.takenAt = dt;
  }
  if (gpsIfdOffset != null) {
    const gps = readGps(view, tiffStart, tiffStart + gpsIfdOffset, le);
    if (gps) out.gps = gps;
  }
  return out;
}

function readDateTimeOriginal(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  le: boolean,
): Date | null {
  if (ifdOffset >= view.byteLength) return null;
  const count = view.getUint16(ifdOffset, le);
  for (let i = 0; i < count; i++) {
    const entry = ifdOffset + 2 + i * 12;
    if (entry + 12 > view.byteLength) break;
    const tag = view.getUint16(entry, le);
    if (tag === 0x9003 || tag === 0x9004) {
      const len = view.getUint32(entry + 4, le);
      const dataOffset = view.getUint32(entry + 8, le);
      const strStart = tiffStart + dataOffset;
      const bytes: number[] = [];
      for (let j = 0; j < len - 1 && strStart + j < view.byteLength; j++) {
        bytes.push(view.getUint8(strStart + j));
      }
      const s = String.fromCharCode(...bytes); // "YYYY:MM:DD HH:MM:SS"
      const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (m) {
        return new Date(
          Number(m[1]),
          Number(m[2]) - 1,
          Number(m[3]),
          Number(m[4]),
          Number(m[5]),
          Number(m[6]),
        );
      }
    }
  }
  return null;
}

function readGps(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  le: boolean,
): ExifGps | null {
  if (ifdOffset >= view.byteLength) return null;
  const count = view.getUint16(ifdOffset, le);
  let latRef = "N";
  let lonRef = "E";
  let lat: number | null = null;
  let lon: number | null = null;
  for (let i = 0; i < count; i++) {
    const entry = ifdOffset + 2 + i * 12;
    if (entry + 12 > view.byteLength) break;
    const tag = view.getUint16(entry, le);
    const dataOffset = view.getUint32(entry + 8, le);
    if (tag === 0x0001) latRef = String.fromCharCode(view.getUint8(entry + 8));
    if (tag === 0x0003) lonRef = String.fromCharCode(view.getUint8(entry + 8));
    if (tag === 0x0002 || tag === 0x0004) {
      const base = tiffStart + dataOffset;
      if (base + 24 > view.byteLength) continue;
      const deg = rationalToFloat(view, base, le);
      const min = rationalToFloat(view, base + 8, le);
      const sec = rationalToFloat(view, base + 16, le);
      const dec = deg + min / 60 + sec / 3600;
      if (tag === 0x0002) lat = dec;
      else lon = dec;
    }
  }
  if (lat == null || lon == null) return null;
  return {
    latitude: latRef === "S" ? -lat : lat,
    longitude: lonRef === "W" ? -lon : lon,
  };
}

async function readExif(file: File): Promise<ExifData> {
  const slice = file.slice(0, 256 * 1024);
  const buf = await slice.arrayBuffer();
  try {
    return parseExif(buf);
  } catch {
    return {};
  }
}

async function dimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

export type WebPickedFile = { photo: Photo; file: File };

export async function pickPhotosFromFiles(files: FileList | File[]): Promise<WebPickedFile[]> {
  const arr = Array.from(files);
  const results: WebPickedFile[] = [];
  for (const file of arr) {
    if (!file.type.startsWith("image/")) continue;
    const url = URL.createObjectURL(file);
    const exif = await readExif(file);
    const dim = await dimensions(file);
    const createdAt = (exif.takenAt ?? new Date(file.lastModified)).toISOString();
    results.push({
      photo: {
        id: `${file.name}-${file.size}-${file.lastModified}`,
        uri: url,
        createdAt,
        width: dim.width,
        height: dim.height,
        location: exif.gps,
      },
      file,
    });
  }
  // Tri du plus récent au plus ancien (cohérent avec listPhotosSince mobile)
  results.sort((a, b) => (a.photo.createdAt < b.photo.createdAt ? 1 : -1));
  return results;
}
