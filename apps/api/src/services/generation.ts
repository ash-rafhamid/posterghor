import { EXPORT_SCALE, resolvePoster, type LayoutConfig, type PosterContent, type PosterFormData, type PosterScheme, type PosterStage, type ResolvedPoster } from "@poster/shared";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { GenerationLog } from "../models/GenerationLog";
import { Poster, type PosterDoc } from "../models/Poster";
import { Template } from "../models/Template";
import { artDirect } from "./ai/art-director";
import { makePreview, optimisePng, pngToJpeg, prepareForRender, type RenderPhoto } from "./images";
import { describePhotoFlags } from "./moderation";
import { renderPoster } from "./render/renderer";
import { getStorage } from "./storage";

/**
 * The generation pipeline: photos → art direction (Gemini) → HTML render (headless Chrome) → storage.
 * Runs in-process behind a small queue (see queue.ts); the API only ever flips the poster's status and polls.
 */

const STAGE_PCT: Record<PosterStage, number> = { queued: 4, photos: 14, art_direction: 34, rendering: 62, saving: 88, done: 100 };

async function setStage(id: unknown, stage: PosterStage): Promise<void> {
  await Poster.updateOne({ _id: id }, { $set: { "progress.stage": stage, "progress.pct": STAGE_PCT[stage] } });
}

interface LoadedPhotos {
  render: RenderPhoto[];
  alpha: boolean[];
}

async function loadPhotos(poster: PosterDoc): Promise<LoadedPhotos> {
  const storage = getStorage();
  const render: RenderPhoto[] = [];
  const alpha: boolean[] = [];
  for (let i = 0; i < poster.uploadedPhotoUrls.length; i++) {
    const url = poster.uploadedPhotoUrls[i]!;
    const meta = poster.photoMeta.find((m) => m.url === url);
    let buf: Buffer;
    try {
      buf = await storage.read(url);
    } catch (e) {
      logger.error({ err: e, url }, "could not read uploaded photo");
      throw new Error(`Photo ${i + 1} could not be loaded. Please upload it again.`);
    }
    render.push(await prepareForRender(buf, !!meta?.hasAlpha));
    alpha.push(!!meta?.hasAlpha);
  }
  return { render, alpha };
}

export function buildContent(form: PosterFormData, photos: LoadedPhotos): PosterContent {
  return {
    occasion: form.occasion,
    headline: form.headline,
    subheadline: form.subheadline || undefined,
    name: form.name,
    designation: form.designation || undefined,
    party: form.party || undefined,
    union: form.union || undefined,
    thana: form.thana || undefined,
    district: form.district || undefined,
    creditLabel: form.creditLabel || undefined,
    dateText: form.dateText || undefined,
    photos: photos.render.map((p, i) => ({
      src: p.dataUri,
      caption: form.photos[i]?.caption || undefined,
      subcaption: form.photos[i]?.subcaption || undefined,
      alpha: photos.alpha[i],
    })),
  };
}

async function toDataUri(url: string): Promise<string | undefined> {
  try {
    const buf = await getStorage().read(url);
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function resolveForRender(opts: {
  layout: LayoutConfig;
  form: PosterFormData;
  photos: LoadedPhotos;
  scheme: PosterScheme;
  variant: number;
}): Promise<ResolvedPoster> {
  const resolved = resolvePoster({
    layout: opts.layout,
    content: buildContent(opts.form, opts.photos),
    scheme: opts.scheme,
    variant: opts.variant,
    choices: {
      headlineFont: opts.form.headlineFont,
      frame: opts.form.frame,
      photoLayout: opts.form.photoLayout,
      useAiBackdrop: opts.form.useAiBackdrop,
    },
  });
  // the headless browser is network-isolated, so backdrops travel as inline data too
  if (resolved.backdropUrl) resolved.backdropUrl = await toDataUri(resolved.backdropUrl);
  return resolved;
}

const fileStamp = (variant: number) => `v${variant}-${Date.now().toString(36)}`;

/** Runs one generation attempt for a poster that is already flagged `generating`. Never throws. */
export async function runGeneration(posterId: string): Promise<void> {
  const started = Date.now();
  const poster = await Poster.findById(posterId);
  if (!poster || poster.status !== "generating") return;

  const log = {
    posterId: poster._id,
    userId: poster.userId,
    templateId: poster.templateId,
    model: "",
    promptUsed: "",
    tokensUsed: 0,
    promptTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
    renderMs: 0,
    totalMs: 0,
    success: false,
    cacheHit: true,
    source: "fallback" as "gemini" | "fallback",
    error: undefined as string | undefined,
  };

  try {
    const template = await Template.findById(poster.templateId);
    if (!template) throw new Error("This template is no longer available.");
    const layout = template.layoutConfig as LayoutConfig;
    const form = poster.formData as PosterFormData;
    const variant = poster.variant;

    await setStage(poster._id, "photos");
    const photos = await loadPhotos(poster);

    await setStage(poster._id, "art_direction");
    // "auto" → Gemini designs the palette; otherwise the user pinned one of the template's curated colourways
    const pinnedIndex = form.palette && form.palette !== "auto" ? layout.colorways.findIndex((c) => c.id === form.palette) : -1;
    const art = await artDirect({
      templateId: String(template._id),
      templateTitle: template.title,
      layout,
      formData: { occasion: form.occasion, useAiBackdrop: form.useAiBackdrop },
      variant,
      photos: photos.render.map((p) => ({ thumb: p.thumb, hash: p.hash })),
      forceColorway: pinnedIndex >= 0 ? pinnedIndex : undefined,
    });
    Object.assign(log, {
      model: art.log.model,
      promptUsed: art.log.prompt,
      tokensUsed: art.log.tokens.total,
      promptTokens: art.log.tokens.prompt,
      outputTokens: art.log.tokens.output,
      latencyMs: art.log.latencyMs,
      cacheHit: art.log.cacheHit,
      source: art.log.source,
      error: art.log.error,
    });

    // Photo safety flags → moderation queue (we still render; an admin decides).
    if (art.flags.length) {
      const reasons = describePhotoFlags(art.flags);
      const merged = [...new Set([...(poster.moderation?.reasons ?? []), ...reasons])];
      poster.set("moderation.status", poster.moderation?.status === "blocked" ? "blocked" : "flagged");
      poster.set("moderation.reasons", merged);
      await poster.save();
    }

    await setStage(poster._id, "rendering");
    const resolved = await resolveForRender({ layout, form, photos, scheme: art.scheme, variant });
    const rendered = await renderPoster(resolved, { scale: EXPORT_SCALE });
    log.renderMs = rendered.ms;

    await setStage(poster._id, "saving");
    // one after the other: two 2400×3200 sharp pipelines at once double the peak memory
    const preview = await makePreview(rendered.png);
    const optimised = await optimisePng(rendered.png);
    let master = optimised;
    let ext: "png" | "jpg" = "png";
    // Cloudinary's free tier caps images at 10 MB — keep a print-grade JPEG master if a PNG would exceed it.
    if (env.storageDriver === "cloudinary" && master.length > 9.5 * 1024 * 1024) {
      master = await pngToJpeg(rendered.png);
      ext = "jpg";
    }
    const storage = getStorage();
    const stamp = fileStamp(variant);
    const [imgFile, prevFile] = await Promise.all([
      storage.save({ buffer: master, folder: `posters/${poster._id}`, filename: `${stamp}-print.${ext}`, contentType: ext === "png" ? "image/png" : "image/jpeg" }),
      storage.save({ buffer: preview, folder: `posters/${poster._id}`, filename: `${stamp}-preview.jpg`, contentType: "image/jpeg" }),
    ]);

    const fresh = await Poster.findById(poster._id);
    if (!fresh) {
      // deleted while generating — don't leave the files we just stored behind
      await Promise.all([storage.delete(imgFile.url), storage.delete(prevFile.url)]).catch(() => undefined);
      return;
    }
    fresh.versions.push({
      variant,
      imageUrl: imgFile.url,
      previewUrl: prevFile.url,
      width: rendered.width,
      height: rendered.height,
      scheme: art.scheme,
      createdAt: new Date(),
    } as never);
    const version = fresh.versions[fresh.versions.length - 1]!;
    fresh.selectedVersion = version._id;
    fresh.generatedImageUrl = imgFile.url;
    fresh.previewImageUrl = prevFile.url;
    fresh.width = rendered.width;
    fresh.height = rendered.height;
    fresh.scheme = art.scheme as never;
    fresh.layoutSnapshot = layout as never;
    fresh.status = "completed";
    fresh.error = undefined;
    fresh.progress = { stage: "done", pct: 100 } as never;
    fresh.completedAt = new Date();
    await fresh.save();
    log.success = true;
    logger.info({ poster: String(poster._id), variant, ms: Date.now() - started, source: art.log.source, cache: art.log.cacheHit }, "poster generated");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error({ err: e, poster: String(poster._id) }, "poster generation failed");
    log.error = [log.error, message].filter(Boolean).join(" | ").slice(0, 500);
    await Poster.updateOne(
      { _id: poster._id },
      { $set: { status: "failed", error: friendlyError(message), "progress.stage": "queued", "progress.pct": 0 } },
    );
  } finally {
    log.totalMs = Date.now() - started;
    await GenerationLog.create(log).catch((err) => logger.warn({ err }, "could not write generation log"));
  }
}

function friendlyError(message: string): string {
  if (/timed out/i.test(message)) return "The renderer took too long. Please try again in a moment.";
  if (/photo \d+ could not be loaded/i.test(message) || /template is no longer/i.test(message)) return message;
  return "Something went wrong while composing your poster. Please try again.";
}

/** Tiny LRU for rendered PDFs — repeated clicks on "PDF" shouldn't re-render, but nothing is persisted. */
const pdfCache = new Map<string, { at: number; buf: Buffer }>();
const PDF_TTL_MS = 5 * 60_000;
const PDF_MAX = 6;

/**
 * Renders the print PDF for a poster version on demand (vector text + effects, from the same resolved poster as the
 * PNG so the two always match). Not stored: some CDNs (e.g. Cloudinary's free plan) block PDF delivery by default,
 * and a fresh render only takes a couple of seconds.
 */
export async function renderPdf(poster: PosterDoc, versionId?: string): Promise<Buffer> {
  const version = poster.versions.find((v) => String(v._id) === (versionId ?? String(poster.selectedVersion))) ?? poster.versions[poster.versions.length - 1];
  if (!version) throw new Error("This poster has not been generated yet.");

  const key = `${poster._id}:${version._id}:${poster.updatedAt?.getTime() ?? 0}`;
  const hit = pdfCache.get(key);
  if (hit && Date.now() - hit.at < PDF_TTL_MS) return hit.buf;

  const layout = (poster.layoutSnapshot ?? (await Template.findById(poster.templateId))?.layoutConfig) as LayoutConfig | undefined;
  if (!layout) throw new Error("Template layout is unavailable.");
  const photos = await loadPhotos(poster);
  const resolved = await resolveForRender({ layout, form: poster.formData as PosterFormData, photos, scheme: version.scheme as PosterScheme, variant: version.variant });
  const { pdf } = await renderPoster(resolved, { pdfOnly: true });
  if (!pdf) throw new Error("PDF rendering failed");

  pdfCache.set(key, { at: Date.now(), buf: pdf });
  while (pdfCache.size > PDF_MAX) pdfCache.delete(pdfCache.keys().next().value as string);
  return pdf;
}
