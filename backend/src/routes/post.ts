import { Hono } from "hono";
import type { FamileoClient } from "../famileo/FamileoClient.js";
import type { PhotoUpload } from "../famileo/types.js";

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export function postRoutes(famileo: FamileoClient) {
  const app = new Hono();
  app.post("/post", async (c) => {
    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      return c.json({ error: "invalid multipart body" }, 400);
    }

    const padId = form.get("padId");
    const text = form.get("text");
    const rawPhotos = form.getAll("photos");

    if (typeof padId !== "string" || padId.length === 0) {
      return c.json({ error: "padId required" }, 400);
    }
    if (typeof text !== "string" || text.trim().length === 0) {
      return c.json({ error: "text required" }, 400);
    }
    if (rawPhotos.length === 0) return c.json({ error: "at least one photo required" }, 400);
    if (rawPhotos.length > MAX_PHOTOS) {
      return c.json({ error: `at most ${MAX_PHOTOS} photos` }, 400);
    }

    const photos: PhotoUpload[] = [];
    for (const raw of rawPhotos) {
      if (!(raw instanceof Blob)) return c.json({ error: "invalid photo" }, 400);
      if (raw.size > MAX_PHOTO_BYTES) return c.json({ error: "photo too large" }, 400);
      const bytes = Buffer.from(await raw.arrayBuffer());
      const filename = (raw as File).name ?? "photo.jpg";
      photos.push({
        filename,
        contentType: raw.type || "image/jpeg",
        bytes,
      });
    }

    await famileo.ensureSession();
    try {
      const result = await famileo.createPost({ padId, text, photos });
      return c.json(result);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.toLowerCase().includes("unknown pad")) {
        return c.json({ error: "unknown pad" }, 404);
      }
      throw e;
    }
  });
  return app;
}
