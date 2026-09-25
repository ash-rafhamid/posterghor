import multer from "multer";
import { env } from "../config/env";

/** In-memory multipart parsing (files are re-encoded with sharp, then handed to the storage provider). */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1, fields: 4 },
  fileFilter: (_req, file, cb) => {
    // First cheap gate on the declared type; the real check is sharp decoding the bytes (services/images.ts).
    if (/^image\/(jpeg|jpg|png|webp|gif|tiff|heif|avif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
  },
}).single("file");
