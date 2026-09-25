import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import type { Focus } from "@poster/shared";
import { env } from "../config/env";
import { badRequest } from "../lib/errors";

if (env.lowMemory) {
  sharp.cache(false);
  sharp.concurrency(1);
}

const ACCEPTED = new Set(["jpeg", "png", "webp", "gif", "tiff", "heif", "avif"]);

export interface NormalizedUpload {
  buffer: Buffer;
  contentType: "image/jpeg" | "image/png";
  ext: "jpg" | "png";
  width: number;
  height: number;
  hasAlpha: boolean;
  lowRes: boolean;
}

/**
 * Validates and normalises a user upload:
 *  - decodes with sharp (so anything that isn't a real image is rejected, whatever its extension / MIME claims)
 *  - applies EXIF rotation, strips all metadata (GPS etc.)
 *  - caps the size at 2000px on the long side
 *  - keeps transparency (cut-out PNGs) or emits a high-quality JPEG
 */
export async function normalizeUpload(input: Buffer): Promise<NormalizedUpload> {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 80_000_000 }).metadata();
  } catch {
    throw badRequest("That file doesn't look like a valid image. Please upload a JPG, PNG or WebP photo.", "INVALID_IMAGE");
  }
  if (!meta.format || !ACCEPTED.has(meta.format) || !meta.width || !meta.height) {
    throw badRequest("Unsupported image type. Please upload a JPG, PNG or WebP photo.", "INVALID_IMAGE");
  }

  let hasAlpha = false;
  if (meta.hasAlpha) {
    const stats = await sharp(input).stats();
    hasAlpha = !stats.isOpaque;
  }

  const pipeline = sharp(input, { limitInputPixels: 80_000_000 }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true });
  const out = hasAlpha
    ? await pipeline.png({ compressionLevel: 9, effort: 6 }).toBuffer({ resolveWithObject: true })
    : await pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer({ resolveWithObject: true });

  const { width, height } = out.info;
  return {
    buffer: out.data,
    contentType: hasAlpha ? "image/png" : "image/jpeg",
    ext: hasAlpha ? "png" : "jpg",
    width,
    height,
    hasAlpha,
    lowRes: Math.min(width, height) < 600,
  };
}

export interface RenderPhoto {
  /** inline data URI for the print render (no network needed inside the headless browser) */
  dataUri: string;
  /** small JPEG for AI analysis */
  thumb: Buffer;
  /** stable content hash — cache key for per-photo AI results */
  hash: string;
}

/** Prepares a stored photo for rendering: a ≤1800px inline image plus a 512px analysis thumbnail. */
export async function prepareForRender(buffer: Buffer, hasAlpha: boolean): Promise<RenderPhoto> {
  const base = () => sharp(buffer).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true });
  const [main, thumb] = await Promise.all([
    hasAlpha ? base().png({ compressionLevel: 8 }).toBuffer() : base().jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toBuffer(),
    sharp(buffer).rotate().resize({ width: 512, height: 512, fit: "inside" }).flatten({ background: "#ffffff" }).jpeg({ quality: 72 }).toBuffer(),
  ]);
  return {
    dataUri: `data:${hasAlpha ? "image/png" : "image/jpeg"};base64,${main.toString("base64")}`,
    thumb,
    hash: createHash("sha1").update(thumb).digest("hex"),
  };
}

/**
 * Cheap, dependency-free focal-point estimate used when Gemini isn't available: finds the centroid of skin-tone
 * pixels in the upper part of the picture (YCbCr skin model). Good enough to keep a face in a portrait frame.
 */
export async function estimateFocus(thumb: Buffer): Promise<Focus> {
  const { data, info } = await sharp(thumb).resize(96, 96, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let sw = 0;
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    const vy = 1 - 0.55 * Math.pow(y / height, 2); // faces sit in the upper part of a portrait
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      if (Y > 45 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
        const w = vy;
        sw += w;
        sx += x * w;
        sy += y * w;
        count++;
      }
    }
  }
  if (count < width * height * 0.015 || sw === 0) return { x: 0.5, y: 0.34, zoom: 1 };
  return { x: clamp01(sx / sw / width), y: clamp01(sy / sw / height - 0.05), zoom: 1 };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** JPEG preview (1200×1600) + optional master re-encode for a rendered poster. */
export async function makePreview(png: Buffer): Promise<Buffer> {
  return sharp(png).resize(1200, 1600, { fit: "fill" }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}

export async function pngToJpeg(png: Buffer): Promise<Buffer> {
  return sharp(png).jpeg({ quality: 95, chromaSubsampling: "4:4:4", mozjpeg: true }).toBuffer();
}

/**
 * Lossless PNG recompression. Chrome's screenshot is ~9 MB; posters are flat colours + photos, so this lands near
 * 2 MB. (Benchmarked: effort 1 is both faster *and* smaller than effort 7 for this kind of image.)
 */
export async function optimisePng(png: Buffer): Promise<Buffer> {
  return sharp(png).png({ compressionLevel: 6, effort: 1 }).toBuffer();
}
