import { Readable } from "node:stream";
import { ObjectId } from "mongodb";
import multer from "multer";
import sharp from "sharp";
import { uploads } from "./db.js";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.mimetype)),
});

/**
 * Normalises an uploaded photo (auto-rotation, max 2000 px, WebP) and stores it in GridFS.
 * Returns the public URL (/uploads/<id>).
 */
export async function storeImage(file) {
  const { data, info } = await sharp(file.buffer)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const stream = uploads.openUploadStream(file.originalname.replace(/\.[^.]+$/, "") + ".webp", {
    metadata: { contentType: "image/webp", width: info.width, height: info.height, originalName: file.originalname },
  });
  await new Promise((resolve, reject) => Readable.from(data).pipe(stream).on("finish", resolve).on("error", reject));
  return `/uploads/${stream.id}`;
}

export async function removeImage(url) {
  const id = url?.startsWith("/uploads/") ? url.slice("/uploads/".length) : null;
  if (!id || !ObjectId.isValid(id)) return;
  await uploads.delete(new ObjectId(id)).catch(() => {});
}

/** Express handler streaming a GridFS image. */
export async function serveImage(req, res) {
  if (!ObjectId.isValid(req.params.id)) return res.sendStatus(404);
  const id = new ObjectId(req.params.id);
  const file = await uploads.find({ _id: id }).next();
  if (!file) return res.sendStatus(404);
  res.setHeader("Content-Type", file.metadata?.contentType ?? "application/octet-stream");
  res.setHeader("Content-Length", file.length);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  uploads.openDownloadStream(id).on("error", () => res.end()).pipe(res);
}
