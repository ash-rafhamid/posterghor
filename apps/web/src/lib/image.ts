import { avatarSvg } from "@poster/shared";

/**
 * Client-side photo preparation. Photos are decoded (EXIF rotation applied), downscaled to ≤ 2000 px and
 * re-encoded before upload — a 12 MB phone photo becomes ~400 KB, uploads in a blink, and previews instantly.
 * The server re-validates and normalises again, so this is a speed optimisation, never a trust boundary.
 */

export interface PreparedPhoto {
  blob: Blob;
  /** object URL for the live preview — revoke it when the photo is removed */
  previewUrl: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  lowRes: boolean;
  type: "image/jpeg" | "image/png";
}

const MAX_SIDE = 2000;

async function decode(file: File): Promise<ImageBitmap> {
  // 'from-image' honours the EXIF orientation of phone photos
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** True when a bitmap has any meaningfully transparent pixel (i.e. it's a cut-out PNG). */
function detectAlpha(bitmap: ImageBitmap): boolean {
  const s = 48;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(bitmap, 0, 0, s, s);
  const { data } = ctx.getImageData(0, 0, s, s);
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 245) return true;
  return false;
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await decode(file);
  const { width: w0, height: h0 } = bitmap;
  const mayHaveAlpha = /png|webp|gif|avif/i.test(file.type);
  const hasAlpha = mayHaveAlpha ? detectAlpha(bitmap) : false;

  const k = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * k));
  const h = Math.max(1, Math.round(h0 * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser");
  if (!hasAlpha) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const type = hasAlpha ? "image/png" : "image/jpeg";
  const blob = await toBlob(canvas, type, hasAlpha ? undefined : 0.92);
  if (!blob) throw new Error("Could not process this image");
  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    width: w,
    height: h,
    hasAlpha,
    lowRes: Math.min(w0, h0) < 600,
    type,
  };
}

/** Rasterises one of the built-in illustrated (faceless) portraits — for trying the studio without real photos. */
export async function samplePortrait(index: number): Promise<PreparedPhoto> {
  const svgUrl = URL.createObjectURL(new Blob([avatarSvg(index)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = svgUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1125;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await toBlob(canvas, "image/jpeg", 0.92);
    if (!blob) throw new Error("Could not create the sample image");
    return { blob, previewUrl: URL.createObjectURL(blob), width: canvas.width, height: canvas.height, hasAlpha: false, lowRes: false, type: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const isAcceptedImage = (file: File) => ACCEPTED_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
