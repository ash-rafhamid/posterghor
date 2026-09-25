import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { ApiUpload } from "@poster/shared";
import { badRequest } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { uploadLimiter } from "../middleware/rateLimit";
import { imageUpload } from "../middleware/upload";
import { normalizeUpload } from "../services/images";
import { getStorage } from "../services/storage";

export const uploadRouter = Router();

/** POST /api/upload — multipart field `file`. Returns the stored URL (used later in POST /api/posters). */
uploadRouter.post("/", requireAuth, uploadLimiter, (req, res, next) => {
  imageUpload(req, res, (err) => (err ? next(err) : void handle(req, res).catch(next)));
});

async function handle(req: import("express").Request, res: import("express").Response): Promise<void> {
  if (!req.file) throw badRequest("Choose a photo to upload", "NO_FILE");
  const norm = await normalizeUpload(req.file.buffer);
  const stored = await getStorage().save({
    buffer: norm.buffer,
    // the user's id is part of the path — POST /api/posters only accepts photos from the caller's own folder
    folder: `uploads/${String(req.user!._id)}`,
    filename: `${randomUUID()}.${norm.ext}`,
    contentType: norm.contentType,
  });
  const body: ApiUpload & { lowRes: boolean } = {
    url: stored.url,
    width: norm.width,
    height: norm.height,
    hasAlpha: norm.hasAlpha,
    bytes: stored.bytes,
    lowRes: norm.lowRes,
  };
  res.status(201).json(body);
}
