import sharp from "sharp";
import { demoContent, resolvePoster, type LayoutConfig, type OccasionId } from "@poster/shared";
import { renderPoster } from "./render/renderer";
import { getStorage } from "./storage";

/**
 * Renders a template with fictional demo content (illustrated silhouettes, invented names) and stores a
 * 600×800 JPEG thumbnail — no real people's photos are ever used for template previews.
 */
export async function renderTemplateThumbnail(opts: { slug: string; layout: LayoutConfig; occasion: OccasionId; photos?: number }): Promise<string> {
  const content = demoContent(opts.layout, opts.occasion, { photos: opts.photos ?? 3 });
  const resolved = resolvePoster({ layout: opts.layout, content, variant: 0 });
  const { png } = await renderPoster(resolved, { scale: 1 });
  const jpg = await sharp(png).resize(600, 800, { fit: "fill" }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  const stored = await getStorage().save({
    buffer: jpg,
    folder: "templates",
    filename: `${opts.slug}-${Date.now().toString(36)}.jpg`,
    contentType: "image/jpeg",
  });
  return stored.url;
}
