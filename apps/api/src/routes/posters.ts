import { Router, type Request } from "express";
import { Zip, ZipPassThrough } from "fflate";
import mongoose from "mongoose";
import { z } from "zod";
import {
  BULK_FIELDS,
  EXPORT_FORMATS,
  bulkPosterSchema,
  createPosterSchema,
  posterFormSchema,
  regeneratePosterSchema,
  type ApiPoster,
  type BulkPosterInput,
  type CreatePosterInput,
  type Paginated,
  type PosterFormData,
  type RegeneratePosterInput,
} from "@poster/shared";
import { env } from "../config/env";
import { HttpError, badRequest, conflict, forbidden, notFound, unprocessable } from "../lib/errors";
import { isOwnUpload } from "../lib/own-upload";
import { requireAuth } from "../middleware/auth";
import { generateLimiter } from "../middleware/rateLimit";
import { validate } from "../middleware/validate";
import { Poster, type PosterDoc } from "../models/Poster";
import { Template } from "../models/Template";
import { toApiPoster, toTemplateBrief, type TemplateBrief } from "../serializers";
import { renderPdf } from "../services/generation";
import { pngToJpeg } from "../services/images";
import { moderateText } from "../services/moderation";
import { enqueueGeneration } from "../services/queue";
import { getStorage } from "../services/storage";

export const postersRouter = Router();
postersRouter.use(requireAuth);

/* ── helpers ────────────────────────────────────────────────────────────── */

const isAdmin = (req: Request) => req.user!.role === "admin";

async function loadPoster(req: Request): Promise<PosterDoc> {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw notFound("Poster not found");
  const poster = await Poster.findById(id);
  // 404 (not 403) for other people's posters so ids can't be probed
  if (!poster || (String(poster.userId) !== String(req.user!._id) && !isAdmin(req))) throw notFound("Poster not found");
  return poster;
}

/** Photos must come from this app's storage AND from the caller's own upload folder (blocks SSRF + photo theft). */
function assertOwnPhotos(urls: string[], userId: string): void {
  const storage = getStorage();
  for (const url of urls) {
    if (!isOwnUpload(storage, url, userId)) {
      throw badRequest("One of the photos wasn't uploaded through this app. Please upload it again.", "INVALID_PHOTO");
    }
  }
}

const photoMeta = (urls: string[]) => urls.map((url) => ({ url, hasAlpha: /\.png(\?|$)/i.test(url) }));

async function templateBriefs(ids: unknown[]): Promise<Map<string, TemplateBrief>> {
  const uniq = [...new Set(ids.map(String))];
  const docs = await Template.find({ _id: { $in: uniq } }).select("title titleBn slug occasionType thumbnailUrl").lean();
  return new Map(docs.map((d) => [String(d._id), toTemplateBrief(d)]));
}

function assertCleanText(form: Partial<PosterFormData>): { status: "clean" | "flagged"; reasons: string[] } {
  const verdict = moderateText(form);
  if (verdict.status === "blocked") {
    throw unprocessable(
      `We can't create this poster: ${verdict.reasons.join(", ").toLowerCase()}. Please rephrase the text and try again.`,
      "CONTENT_BLOCKED",
      verdict.reasons,
    );
  }
  return { status: verdict.status, reasons: verdict.reasons };
}

const listQuery = z.object({
  status: z.enum(["draft", "generating", "completed", "failed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});

async function listFor(userId: string, req: Request): Promise<Paginated<ApiPoster>> {
  const { status, page, pageSize } = req.query as unknown as z.infer<typeof listQuery>;
  const filter = { userId, ...(status ? { status } : {}) };
  const [docs, total] = await Promise.all([
    Poster.find(filter)
      .select("-layoutSnapshot -photoMeta -versions.scheme")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Poster.countDocuments(filter),
  ]);
  const briefs = await templateBriefs(docs.map((d) => d.templateId));
  return { items: docs.map((d) => toApiPoster(d, { template: briefs.get(String(d.templateId)) })), total, page, pageSize };
}

/* ── routes ─────────────────────────────────────────────────────────────── */

/** GET /api/posters — the signed-in user's poster history. */
postersRouter.get("/", validate(listQuery, "query"), async (req, res) => {
  res.json(await listFor(String(req.user!._id), req));
});

/** GET /api/posters/user/:userId — history for a given user (self or admin). */
postersRouter.get("/user/:userId", validate(listQuery, "query"), async (req, res) => {
  const userId = String(req.params.userId);
  if (userId !== String(req.user!._id) && !isAdmin(req)) throw forbidden();
  if (!mongoose.isValidObjectId(userId)) throw notFound("User not found");
  res.json(await listFor(userId, req));
});

/* ── bulk (CSV → many posters) ──────────────────────────────────────────── */

const idsSchema = z
  .string()
  .transform((s) => s.split(",").map((x) => x.trim()).filter((x) => mongoose.isValidObjectId(x)))
  .pipe(z.array(z.string()).min(1, "No poster ids given").max(50));

/** GET /api/posters/batch?ids=a,b,c — poll a whole batch in one request (bulk progress screen). */
postersRouter.get("/batch", validate(z.object({ ids: idsSchema }), "query"), async (req, res) => {
  const { ids } = req.query as unknown as { ids: string[] };
  const docs = await Poster.find({ _id: { $in: ids }, ...(isAdmin(req) ? {} : { userId: req.user!._id }) })
    .select("-layoutSnapshot -photoMeta -versions.scheme")
    .lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const briefs = await templateBriefs(docs.map((d) => d.templateId));
  const items = ids.flatMap((id) => {
    const d = byId.get(id);
    return d ? [toApiPoster(d, { template: briefs.get(String(d.templateId)) })] : [];
  });
  res.set("Cache-Control", "no-store");
  res.json({ items });
});

const CLEAN_FIELD_SET = new Set<string>(BULK_FIELDS);

/**
 * POST /api/posters/bulk — one template + shared content/photos, one row of per-person fields per poster.
 * Rows that fail validation or moderation are skipped (and reported); the rest are queued like normal posters.
 */
postersRouter.post("/bulk", generateLimiter, validate(bulkPosterSchema), async (req, res) => {
  const { templateId, base, rows } = req.body as BulkPosterInput;
  const userId = String(req.user!._id);

  const template = await Template.findOne({ _id: templateId, isActive: true });
  if (!template) throw notFound("That template isn't available any more");

  const since = new Date(Date.now() - 24 * 3600_000);
  const today = await Poster.countDocuments({ userId, createdAt: { $gte: since } });
  if (today + rows.length > env.DAILY_POSTER_LIMIT) {
    throw new HttpError(429, `This batch would exceed your daily limit of ${env.DAILY_POSTER_LIMIT} posters (${today} made in the last 24 h).`, "DAILY_LIMIT");
  }

  const created: ApiPoster[] = [];
  const skipped: Array<{ row: number; reason: string }> = [];
  let photosChecked = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    // only whitelisted per-person columns may override the shared form, and only when actually filled in
    const overrides: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) if (CLEAN_FIELD_SET.has(k) && typeof v === "string" && v.trim()) overrides[k] = v;

    const parsed = posterFormSchema.safeParse({ ...base, ...overrides, occasion: template.occasionType });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      skipped.push({ row: i + 1, reason: issue ? `${issue.path.join(".") || "form"}: ${issue.message}` : "Invalid row" });
      continue;
    }
    const form = parsed.data;
    if (!form.photos.length) throw badRequest("Add at least one photo — posters are built around portraits.", "PHOTO_REQUIRED");
    if (!photosChecked) {
      assertOwnPhotos(form.photos.map((p) => p.url), userId);
      photosChecked = true;
    }
    const verdict = moderateText(form);
    if (verdict.status === "blocked") {
      skipped.push({ row: i + 1, reason: verdict.reasons.join(", ") });
      continue;
    }

    const urls = form.photos.map((p) => p.url);
    const poster = await Poster.create({
      userId,
      templateId: template._id,
      formData: form,
      uploadedPhotoUrls: urls,
      photoMeta: photoMeta(urls),
      status: "generating",
      progress: { stage: "queued", pct: 4 },
      variant: 0,
      regenCount: 0,
      consentAt: new Date(),
      moderation: { status: verdict.status, reasons: verdict.reasons },
    });
    enqueueGeneration(String(poster._id));
    created.push(toApiPoster(poster, { template: toTemplateBrief(template) }));
  }

  if (!created.length) throw unprocessable("None of the rows could be turned into a poster.", "BULK_EMPTY", skipped);
  await Template.updateOne({ _id: template._id }, { $inc: { usageCount: created.length } });
  res.status(202).json({ posters: created, skipped });
});

const zipQuery = z.object({ ids: idsSchema, format: z.enum(["png", "jpg"]).default("png") });
const zipSafe = (s: string) => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);

/** GET /api/posters/bulk/zip?ids=…&format=png|jpg — every finished poster of a batch in one ZIP. */
postersRouter.get("/bulk/zip", validate(zipQuery, "query"), async (req, res) => {
  const { ids, format } = req.query as unknown as { ids: string[]; format: "png" | "jpg" };
  const docs = await Poster.find({ _id: { $in: ids }, status: "completed", "moderation.status": { $ne: "blocked" }, ...(isAdmin(req) ? {} : { userId: req.user!._id }) });
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const posters = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  if (!posters.length) throw conflict("None of these posters are ready yet", "NOT_READY");

  res.set({
    "Content-Type": "application/zip",
    "Content-Disposition": 'attachment; filename="posterghor-batch.zip"',
    "Cache-Control": "private, no-store",
    "Access-Control-Expose-Headers": "Content-Disposition",
  });
  const zip = new Zip((err, chunk, final) => {
    if (err) return void res.destroy(err);
    res.write(chunk);
    if (final) res.end();
  });

  const storage = getStorage();
  const used = new Set<string>();
  try {
    for (const [i, p] of posters.entries()) {
      const version = p.versions.id(String(p.selectedVersion)) ?? p.versions[p.versions.length - 1];
      if (!version) continue;
      const master = await storage.read(version.imageUrl);
      const isJpeg = /\.jpe?g(\?|$)/i.test(version.imageUrl);
      const data = format === "jpg" && !isJpeg ? await pngToJpeg(master) : master;
      const ext = format === "png" && isJpeg ? "jpg" : format;
      const person = zipSafe(String((p.formData as PosterFormData).name ?? "")) || `poster-${String(p._id).slice(-6)}`;
      let name = `${String(i + 1).padStart(2, "0")}-${person}.${ext}`;
      while (used.has(name)) name = name.replace(/(\.\w+)$/, `-${String(p._id).slice(-4)}$1`);
      used.add(name);
      const entry = new ZipPassThrough(name);
      zip.add(entry);
      entry.push(new Uint8Array(data), true);
    }
  } finally {
    zip.end();
  }
});

/** POST /api/posters — create a poster request and start generating it. */
postersRouter.post("/", generateLimiter, validate(createPosterSchema), async (req, res) => {
  const { templateId, formData: form } = req.body as CreatePosterInput;
  const userId = String(req.user!._id);

  const template = await Template.findOne({ _id: templateId, isActive: true });
  if (!template) throw notFound("That template isn't available any more");
  if (!form.photos.length) throw badRequest("Add at least one photo — posters are built around portraits.", "PHOTO_REQUIRED");
  assertOwnPhotos(form.photos.map((p) => p.url), userId);
  const verdict = assertCleanText(form);

  const since = new Date(Date.now() - 24 * 3600_000);
  if ((await Poster.countDocuments({ userId, createdAt: { $gte: since } })) >= env.DAILY_POSTER_LIMIT) {
    throw new HttpError(429, `Daily limit of ${env.DAILY_POSTER_LIMIT} posters reached. Please come back tomorrow.`, "DAILY_LIMIT");
  }

  const urls = form.photos.map((p) => p.url);
  const poster = await Poster.create({
    userId,
    templateId: template._id,
    formData: { ...form, occasion: template.occasionType },
    uploadedPhotoUrls: urls,
    photoMeta: photoMeta(urls),
    status: "generating",
    progress: { stage: "queued", pct: 4 },
    variant: 0,
    regenCount: 0,
    consentAt: new Date(),
    moderation: { status: verdict.status, reasons: verdict.reasons },
  });
  await Template.updateOne({ _id: template._id }, { $inc: { usageCount: 1 } });
  enqueueGeneration(String(poster._id));

  res.status(202).json({ poster: toApiPoster(poster, { template: toTemplateBrief(template) }) });
});

/** GET /api/posters/:id — status + result (polled by the studio while generating). */
postersRouter.get("/:id", async (req, res) => {
  const poster = await loadPoster(req);
  const brief = (await templateBriefs([poster.templateId])).get(String(poster.templateId));
  res.set("Cache-Control", "no-store");
  res.json({ poster: toApiPoster(poster, { template: brief, admin: isAdmin(req) }) });
});

/**
 * POST /api/posters/:id/regenerate — limited retries.
 * Body: { formData?: partial edits, keepStyle?: boolean }. `keepStyle` re-renders the same colourway (typo fixes);
 * otherwise the next art-direction variant is used.
 */
postersRouter.post("/:id/regenerate", generateLimiter, validate(regeneratePosterSchema), async (req, res) => {
  const poster = await loadPoster(req);
  const body = req.body as RegeneratePosterInput;
  if (poster.status === "generating") throw conflict("This poster is still being generated — hang on a moment.", "BUSY");
  if (poster.moderation?.status === "blocked") throw forbidden("This poster was blocked by moderation and can't be regenerated.", "BLOCKED");
  if (poster.regenCount >= env.MAX_REGENERATIONS) {
    throw forbidden(`You've used all ${env.MAX_REGENERATIONS} regenerations for this poster. Create a new poster to keep exploring.`, "REGEN_LIMIT");
  }
  const template = await Template.findById(poster.templateId);
  if (!template) throw notFound("The template for this poster no longer exists");

  const merged = posterFormSchema.parse({ ...(poster.formData as object), ...(body.formData ?? {}), occasion: template.occasionType });
  // "Try another look" hands the palette back to the art director (a pinned colourway would just repeat itself)
  if (!body.keepStyle) merged.palette = "auto";
  if (!merged.photos.length) throw badRequest("Add at least one photo — posters are built around portraits.", "PHOTO_REQUIRED");
  assertOwnPhotos(merged.photos.map((p) => p.url), String(poster.userId));
  const verdict = assertCleanText(merged);

  const urls = merged.photos.map((p) => p.url);
  poster.formData = merged as never;
  poster.uploadedPhotoUrls = urls as never;
  poster.photoMeta = photoMeta(urls) as never;
  poster.regenCount += 1;
  if (!body.keepStyle) poster.variant += 1;
  poster.status = "generating";
  poster.error = undefined;
  poster.progress = { stage: "queued", pct: 4 } as never;
  if (verdict.status === "flagged" && poster.moderation?.status === "clean") {
    poster.set("moderation.status", "flagged");
    poster.set("moderation.reasons", verdict.reasons);
  }
  await poster.save();
  enqueueGeneration(String(poster._id));

  res.status(202).json({ poster: toApiPoster(poster, { template: toTemplateBrief(template) }) });
});

/** PATCH /api/posters/:id/version — make an earlier regeneration the "current" one. */
postersRouter.patch("/:id/version", validate(z.object({ versionId: z.string().min(1) })), async (req, res) => {
  const poster = await loadPoster(req);
  const version = poster.versions.id((req.body as { versionId: string }).versionId);
  if (!version) throw notFound("Version not found");
  poster.selectedVersion = version._id;
  poster.generatedImageUrl = version.imageUrl;
  poster.previewImageUrl = version.previewUrl;
  poster.width = version.width;
  poster.height = version.height;
  poster.scheme = version.scheme as never;
  await poster.save();
  const brief = (await templateBriefs([poster.templateId])).get(String(poster.templateId));
  res.json({ poster: toApiPoster(poster, { template: brief, admin: isAdmin(req) }) });
});

/** DELETE /api/posters/:id */
postersRouter.delete("/:id", async (req, res) => {
  const poster = await loadPoster(req);
  const storage = getStorage();
  const files = poster.versions.flatMap((v) => [v.imageUrl, v.previewUrl]).filter((u): u is string => !!u);
  await Promise.allSettled(files.map((u) => storage.delete(u)));
  for (const url of poster.uploadedPhotoUrls) {
    // keep a photo if another poster still uses it
    if (!(await Poster.exists({ _id: { $ne: poster._id }, uploadedPhotoUrls: url }))) await storage.delete(url).catch(() => undefined);
  }
  await poster.deleteOne();
  res.status(204).end();
});

const downloadQuery = z.object({
  format: z.enum(EXPORT_FORMATS).default("png"),
  version: z.string().optional(),
});

const CONTENT_TYPE = { png: "image/png", jpg: "image/jpeg", pdf: "application/pdf" } as const;

/** GET /api/posters/:id/download?format=png|jpg|pdf — print-ready file (Authorization header required). */
postersRouter.get("/:id/download", validate(downloadQuery, "query"), async (req, res) => {
  const poster = await loadPoster(req);
  const { format, version: versionId } = req.query as unknown as z.infer<typeof downloadQuery>;
  if (poster.status !== "completed") throw conflict("This poster isn't ready yet", "NOT_READY");
  if (poster.moderation?.status === "blocked" && !isAdmin(req)) throw forbidden("This poster was blocked by moderation.", "BLOCKED");

  const version = poster.versions.id(versionId ?? String(poster.selectedVersion)) ?? poster.versions[poster.versions.length - 1];
  if (!version) throw notFound("No rendered version found");

  const storage = getStorage();
  let buffer: Buffer;
  if (format === "pdf") {
    buffer = await renderPdf(poster, String(version._id));
  } else {
    const master = await storage.read(version.imageUrl);
    const masterIsJpeg = /\.jpe?g(\?|$)/i.test(version.imageUrl);
    buffer = format === "jpg" && !masterIsJpeg ? await pngToJpeg(master) : master;
  }
  const ext = format === "png" && /\.jpe?g(\?|$)/i.test(version.imageUrl) ? "jpg" : format;
  res.set({
    "Content-Type": CONTENT_TYPE[ext as keyof typeof CONTENT_TYPE],
    "Content-Disposition": `attachment; filename="poster-${String(poster._id).slice(-8)}.${ext}"`,
    "Cache-Control": "private, no-store",
    "Access-Control-Expose-Headers": "Content-Disposition",
  });
  res.send(buffer);
});
