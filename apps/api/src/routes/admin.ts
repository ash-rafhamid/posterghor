import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import {
  OCCASION_IDS,
  moderationActionSchema,
  templateInputSchema,
  type ApiAdminStats,
  type ApiGenerationLog,
  type ModerationActionInput,
  type OccasionId,
  type Paginated,
} from "@poster/shared";
import { env } from "../config/env";
import { conflict, notFound } from "../lib/errors";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { GenerationLog } from "../models/GenerationLog";
import { Poster } from "../models/Poster";
import { Template } from "../models/Template";
import { User } from "../models/User";
import { toApiPoster, toApiTemplate, toApiUser, toTemplateBrief } from "../serializers";
import { renderTemplateThumbnail } from "../services/thumbnails";
import { getStorage } from "../services/storage";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(100).default(20);

/* ── stats ──────────────────────────────────────────────────────────────── */

/** "+06:00" → 360 (minutes east of UTC) */
const offsetMinutes = (() => {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(env.STATS_TZ_OFFSET)!;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
})();

adminRouter.get("/stats", async (_req, res) => {
  // "today" starts at local midnight in the configured offset (Bangladesh by default), not at UTC midnight
  const shifted = Date.now() + offsetMinutes * 60_000;
  const startOfDayShifted = Math.floor(shifted / 86_400_000) * 86_400_000;
  const startOfDay = new Date(startOfDayShifted - offsetMinutes * 60_000);
  const since = new Date(startOfDay.getTime() - 13 * 24 * 3600_000);

  const [users, posters, postersToday, completed, failed, flagged, activeTemplates, logAgg, byOccasionRaw, dailyRaw] = await Promise.all([
    User.countDocuments(),
    Poster.countDocuments(),
    Poster.countDocuments({ createdAt: { $gte: startOfDay } }),
    Poster.countDocuments({ status: "completed" }),
    Poster.countDocuments({ status: "failed" }),
    Poster.countDocuments({ "moderation.status": "flagged" }),
    Template.countDocuments({ isActive: true }),
    GenerationLog.aggregate<{ avgLatency: number; avgRender: number; tokens: number; geminiCalls: number; cacheHits: number }>([
      {
        $group: {
          _id: null,
          avgLatency: { $avg: { $cond: [{ $gt: ["$latencyMs", 0] }, "$latencyMs", null] } },
          avgRender: { $avg: { $cond: [{ $gt: ["$renderMs", 0] }, "$renderMs", null] } },
          tokens: { $sum: "$tokensUsed" },
          geminiCalls: { $sum: { $cond: [{ $and: [{ $eq: ["$source", "gemini"] }, { $eq: ["$cacheHit", false] }] }, 1, 0] } },
          cacheHits: { $sum: { $cond: ["$cacheHit", 1, 0] } },
        },
      },
    ]),
    Poster.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$formData.occasion", count: { $sum: 1 } } }]),
    Poster.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: env.STATS_TZ_OFFSET } }, count: { $sum: 1 } } },
    ]),
  ]);

  const dailyMap = new Map(dailyRaw.map((d) => [d._id, d.count]));
  const daily: ApiAdminStats["daily"] = [];
  for (let i = 0; i < 14; i++) {
    // shift into the configured offset, then read the calendar date off the ISO string
    const key = new Date(since.getTime() + i * 24 * 3600_000 + offsetMinutes * 60_000).toISOString().slice(0, 10);
    daily.push({ date: key, count: dailyMap.get(key) ?? 0 });
  }
  const agg = logAgg[0];
  const body: ApiAdminStats = {
    users,
    posters,
    postersToday,
    completed,
    failed,
    flagged,
    activeTemplates,
    avgLatencyMs: Math.round(agg?.avgLatency ?? 0),
    avgRenderMs: Math.round(agg?.avgRender ?? 0),
    totalTokens: agg?.tokens ?? 0,
    geminiCalls: agg?.geminiCalls ?? 0,
    cacheHits: agg?.cacheHits ?? 0,
    byOccasion: byOccasionRaw.filter((o) => OCCASION_IDS.includes(o._id as OccasionId)).map((o) => ({ occasion: o._id as OccasionId, count: o.count })),
    daily,
  };
  res.json(body);
});

/* ── moderation queue ───────────────────────────────────────────────────── */

const postersQuery = z.object({
  status: z.enum(["draft", "generating", "completed", "failed"]).optional(),
  moderation: z.enum(["clean", "flagged", "blocked"]).optional(),
  q: z.string().trim().max(60).optional(),
  page,
  pageSize,
});

/** GET /api/admin/posters — every poster, filterable (the moderation queue is `?moderation=flagged`). */
adminRouter.get("/posters", validate(postersQuery, "query"), async (req, res) => {
  const q = req.query as unknown as z.infer<typeof postersQuery>;
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.moderation) filter["moderation.status"] = q.moderation;
  if (q.q) {
    const re = new RegExp(escapeRe(q.q), "i");
    filter.$or = [{ "formData.name": re }, { "formData.headline": re }, { "formData.party": re }];
  }
  const [docs, total] = await Promise.all([
    Poster.find(filter)
      .select("-layoutSnapshot -photoMeta -versions.scheme")
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    Poster.countDocuments(filter),
  ]);
  const [users, templates] = await Promise.all([
    User.find({ _id: { $in: docs.map((d) => d.userId) } }).lean(),
    Template.find({ _id: { $in: docs.map((d) => d.templateId) } }).lean(),
  ]);
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const tplMap = new Map(templates.map((t) => [String(t._id), toTemplateBrief(t)]));
  const body: Paginated<ReturnType<typeof toApiPoster>> = {
    items: docs.map((d) => {
      const u = userMap.get(String(d.userId));
      return toApiPoster(d, {
        admin: true,
        template: tplMap.get(String(d.templateId)),
        owner: u ? { id: String(u._id), name: u.name, email: u.email ?? undefined, phone: u.phone ?? undefined } : undefined,
      });
    }),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
  res.json(body);
});

/** PATCH /api/admin/posters/:id/moderation — approve / flag / block. */
adminRouter.patch("/posters/:id/moderation", validate(moderationActionSchema), async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw notFound("Poster not found");
  const { status, note } = req.body as ModerationActionInput;
  const poster = await Poster.findById(id);
  if (!poster) throw notFound("Poster not found");
  poster.set("moderation.status", status);
  poster.set("moderation.note", note ?? undefined);
  poster.set("moderation.reviewedBy", req.user!._id);
  poster.set("moderation.reviewedAt", new Date());
  await poster.save();
  res.json({ poster: toApiPoster(poster, { admin: true }) });
});

/* ── generation logs ────────────────────────────────────────────────────── */

adminRouter.get("/logs", validate(z.object({ page, pageSize, failedOnly: z.coerce.boolean().optional() }), "query"), async (req, res) => {
  const q = req.query as unknown as { page: number; pageSize: number; failedOnly?: boolean };
  const filter = q.failedOnly ? { success: false } : {};
  const [docs, total] = await Promise.all([
    GenerationLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    GenerationLog.countDocuments(filter),
  ]);
  const items: ApiGenerationLog[] = docs.map((l) => ({
    id: String(l._id),
    posterId: String(l.posterId),
    model: l.model ?? "",
    promptUsed: l.promptUsed ?? "",
    tokensUsed: l.tokensUsed ?? 0,
    latencyMs: l.latencyMs ?? 0,
    renderMs: l.renderMs ?? 0,
    success: !!l.success,
    cacheHit: !!l.cacheHit,
    source: (l.source ?? "fallback") as "gemini" | "fallback",
    error: l.error ?? undefined,
    createdAt: new Date((l as { createdAt?: Date }).createdAt ?? 0).toISOString(),
  }));
  res.json({ items, total, page: q.page, pageSize: q.pageSize } satisfies Paginated<ApiGenerationLog>);
});

/* ── users ──────────────────────────────────────────────────────────────── */

adminRouter.get("/users", validate(z.object({ page, pageSize, q: z.string().trim().max(60).optional() }), "query"), async (req, res) => {
  const q = req.query as unknown as { page: number; pageSize: number; q?: string };
  const filter = q.q ? { $or: [{ name: new RegExp(escapeRe(q.q), "i") }, { email: new RegExp(escapeRe(q.q), "i") }, { phone: new RegExp(escapeRe(q.q)) }] } : {};
  const [docs, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
    User.countDocuments(filter),
  ]);
  const counts = await Poster.aggregate<{ _id: unknown; n: number }>([{ $match: { userId: { $in: docs.map((d) => d._id) } } }, { $group: { _id: "$userId", n: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json({
    items: docs.map((u) => ({ ...toApiUser(u), blocked: !!u.blocked, posterCount: countMap.get(String(u._id)) ?? 0 })),
    total,
    page: q.page,
    pageSize: q.pageSize,
  });
});

adminRouter.patch("/users/:id", validate(z.object({ blocked: z.boolean().optional(), role: z.enum(["user", "admin"]).optional() })), async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw notFound("User not found");
  if (id === String(req.user!._id)) throw conflict("You can't change your own access.", "SELF_CHANGE");
  const patch = req.body as { blocked?: boolean; role?: "user" | "admin" };
  const user = await User.findByIdAndUpdate(id, { $set: patch }, { returnDocument: "after" });
  if (!user) throw notFound("User not found");
  res.json({ user: { ...toApiUser(user), blocked: !!user.blocked } });
});

/* ── templates ──────────────────────────────────────────────────────────── */

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `template-${Date.now().toString(36)}`;

adminRouter.get("/templates", async (_req, res) => {
  const docs = await Template.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  res.json({ items: docs.map(toApiTemplate) });
});

adminRouter.post("/templates", validate(templateInputSchema), async (req, res) => {
  const input = req.body as z.infer<typeof templateInputSchema>;
  const slug = input.slug ?? slugify(input.title);
  if (await Template.exists({ slug })) throw conflict("A template with this slug already exists", "SLUG_TAKEN");
  const thumbnailUrl =
    input.thumbnailUrl || (await renderTemplateThumbnail({ slug, layout: input.layoutConfig as never, occasion: input.occasionType }).catch(() => ""));
  const doc = await Template.create({ ...input, slug, thumbnailUrl });
  res.status(201).json({ template: toApiTemplate(doc) });
});

const patchBody = z.record(z.string(), z.unknown());

/** PATCH /api/admin/templates/:id — partial edit; the merged result is fully validated. */
adminRouter.patch("/templates/:id", validate(patchBody), async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw notFound("Template not found");
  const doc = await Template.findById(id);
  if (!doc) throw notFound("Template not found");
  const current = {
    title: doc.title,
    titleBn: doc.titleBn,
    slug: doc.slug,
    description: doc.description,
    occasionType: doc.occasionType,
    thumbnailUrl: doc.thumbnailUrl || "",
    layoutConfig: doc.layoutConfig,
    isActive: doc.isActive,
    sortOrder: doc.sortOrder,
  };
  const merged = templateInputSchema.parse({ ...current, ...(req.body as object) });
  if (merged.slug && merged.slug !== doc.slug && (await Template.exists({ slug: merged.slug, _id: { $ne: doc._id } }))) {
    throw conflict("A template with this slug already exists", "SLUG_TAKEN");
  }
  doc.set({ ...merged, slug: merged.slug ?? doc.slug, thumbnailUrl: merged.thumbnailUrl ?? "" });
  await doc.save();
  res.json({ template: toApiTemplate(doc) });
});

/** POST /api/admin/templates/:id/thumbnail — re-render the preview (after editing the layout). */
adminRouter.post("/templates/:id/thumbnail", async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw notFound("Template not found");
  const doc = await Template.findById(id);
  if (!doc) throw notFound("Template not found");
  const old = doc.thumbnailUrl;
  doc.thumbnailUrl = await renderTemplateThumbnail({ slug: doc.slug, layout: doc.layoutConfig as never, occasion: doc.occasionType as OccasionId });
  await doc.save();
  if (old) await getStorage().delete(old).catch(() => undefined);
  res.json({ template: toApiTemplate(doc) });
});

/** DELETE — hard delete when unused; otherwise it is deactivated (existing posters keep working). */
adminRouter.delete("/templates/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw notFound("Template not found");
  const doc = await Template.findById(id);
  if (!doc) throw notFound("Template not found");
  const used = await Poster.exists({ templateId: doc._id });
  if (used) {
    doc.isActive = false;
    await doc.save();
    res.json({ deleted: false, deactivated: true, template: toApiTemplate(doc) });
    return;
  }
  if (doc.thumbnailUrl) await getStorage().delete(doc.thumbnailUrl).catch(() => undefined);
  await doc.deleteOne();
  res.json({ deleted: true, deactivated: false });
});
