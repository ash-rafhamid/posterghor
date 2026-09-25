import { createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import {
  PALETTE_KEYS,
  cleanText,
  getOccasion,
  isHex,
  sanitizeHex,
  themeMotifPool,
  type Focus,
  type LayoutConfig,
  type Palette,
  type PosterFormData,
  type PosterScheme,
} from "@poster/shared";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { getStorage } from "../storage";
import { estimateFocus } from "../images";
import { cacheGet, cacheList, cacheSet } from "./cache";
import { addUsage, emptyUsage, generateImage, generateJson, geminiEnabled, type AiUsage } from "./gemini";
import { FOCUS_SCHEMA, FOCUS_SYSTEM, HEADLINE_STYLES, PHOTO_FILTERS, SCHEME_SCHEMA, SCHEME_SYSTEM, backdropPrompt } from "./prompts";

/* ────────────────────────────────────────────────────────────────────────────
 * Public API
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ArtDirectionInput {
  templateId: string;
  templateTitle: string;
  layout: LayoutConfig;
  formData: Pick<PosterFormData, "occasion" | "useAiBackdrop">;
  variant: number;
  photos: Array<{ thumb: Buffer; hash: string }>;
  /** the user pinned one of the template's curated colourways — skip the AI palette (photos are still analysed) */
  forceColorway?: number;
}

export interface ArtDirectionLog {
  model: string;
  prompt: string;
  tokens: AiUsage;
  latencyMs: number;
  /** true when no Gemini round-trip was needed (cache and/or fallback) */
  cacheHit: boolean;
  source: "gemini" | "fallback";
  error?: string;
}

export interface ArtDirection {
  scheme: PosterScheme;
  /** moderation reasons discovered while looking at the photos */
  flags: string[];
  log: ArtDirectionLog;
}

/**
 * Gemini acts as the poster's art director. Two independent, separately cached pieces:
 *   1. template-level scheme (palette, decoration set, headline treatment, taglines) — text-only, shared by everyone
 *      using the same template + variant (this is the cost control the brief asks for);
 *   2. per-photo face box → focal point / zoom — cached by photo content hash (regenerating never re-sends photos).
 * Any failure (no key, quota, malformed output) degrades to a curated colourway + a local focal-point estimate.
 */
export async function artDirect(input: ArtDirectionInput): Promise<ArtDirection> {
  let usage = emptyUsage();
  let latencyMs = 0;
  let calledApi = false;
  let model = "";
  const prompts: string[] = [];
  const errors: string[] = [];

  const occasion = getOccasion(input.formData.occasion);
  const tone = input.layout.tone ?? occasion.tone;

  /* 1 ── template-level scheme ─────────────────────────────────────────── */
  const pinned = input.forceColorway !== undefined;
  const base = pinned
    ? null
    : await getSchemeBase(input, tone).catch((e) => {
        errors.push(`scheme: ${msg(e)}`);
        logger.warn({ err: e }, "art director: scheme generation failed — using curated colourway");
        return null;
      });
  if (base) {
    if (base.called) {
      calledApi = true;
      usage = addUsage(usage, base.usage);
      latencyMs += base.latencyMs;
      model = base.model;
      prompts.push(base.prompt);
    }
  }

  let scheme: PosterScheme = base
    ? { ...base.scheme, source: "gemini", variant: input.variant }
    : fallbackScheme(input.layout, input.formData.occasion, pinned ? input.forceColorway! : input.variant);

  /* 2 ── photo focus + safety flags ────────────────────────────────────── */
  const photos = await analysePhotos(input.photos).catch((e) => {
    errors.push(`photos: ${msg(e)}`);
    logger.warn({ err: e }, "art director: photo analysis failed — using local focal-point estimate");
    return null;
  });
  const focus: Array<Focus | null> = [];
  let flags: string[] = [];
  if (photos) {
    if (photos.called) {
      calledApi = true;
      usage = addUsage(usage, photos.usage);
      latencyMs += photos.latencyMs;
      model = model || photos.model;
      prompts.push(photos.prompt);
    }
    focus.push(...photos.focus);
    flags = photos.flags;
  }
  for (let i = 0; i < input.photos.length; i++) {
    if (!focus[i]) focus[i] = await estimateFocus(input.photos[i]!.thumb).catch(() => null);
  }
  scheme.photoFocus = focus;

  /* 3 ── optional AI backdrop plate (template-level, cached) ───────────── */
  if (input.formData.useAiBackdrop && env.AI_BACKDROPS_ENABLED && geminiEnabled()) {
    try {
      const b = await getBackdrop(input, scheme, tone);
      if (b.url) scheme.backdropUrl = b.url;
      if (b.called) {
        calledApi = true;
        usage = addUsage(usage, b.usage);
        latencyMs += b.latencyMs;
        prompts.push(b.prompt);
      }
    } catch (e) {
      errors.push(`backdrop: ${msg(e)}`);
      logger.warn({ err: e }, "art director: backdrop generation failed — continuing with vector art only");
    }
  }

  scheme = { ...scheme, taglines: scheme.taglines?.length ? scheme.taglines : occasion.subheadlines };

  return {
    scheme,
    flags,
    log: {
      model: model || (geminiEnabled() ? env.GEMINI_TEXT_MODEL : "none"),
      prompt: prompts.join("\n\n---\n\n").slice(0, 3900),
      tokens: usage,
      latencyMs,
      cacheHit: !calledApi,
      source: scheme.source,
      error: errors.length ? errors.join(" | ").slice(0, 500) : undefined,
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Scheme
 * ──────────────────────────────────────────────────────────────────────────── */

/** Every field is optional and forgiving: a sloppy field is trimmed or dropped, it never sinks the whole scheme. */
const clip = (n: number) =>
  z
    .string()
    .transform((s) => s.trim().slice(0, n))
    .optional()
    .catch(undefined);

const aiSchemeSchema = z.object({
  colorwayName: clip(60),
  mood: clip(100),
  rationale: clip(340),
  palette: z.record(z.string(), z.unknown()).optional().catch(undefined),
  motifs: z.array(z.string()).optional().catch(undefined),
  headlineStyle: z.enum(HEADLINE_STYLES).optional().catch(undefined),
  photoFilter: z.enum(PHOTO_FILTERS).optional().catch(undefined),
  taglines: z.array(z.string()).optional().catch(undefined),
});

type SchemeBase = Omit<PosterScheme, "source" | "variant" | "photoFocus" | "backdropUrl">;

const sha = (s: string) => createHash("sha1").update(s).digest("hex");
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function layoutFingerprint(layout: LayoutConfig, tone: string): string {
  return sha(JSON.stringify({ t: layout.themeId, p: layout.palette, m: layout.motifs, tone })).slice(0, 10);
}

/** Validates + sanitises Gemini's JSON. Unknown motifs are dropped, colours re-validated, text cleaned. */
function sanitiseScheme(raw: unknown, layout: LayoutConfig): SchemeBase {
  const parsed = aiSchemeSchema.parse(raw);
  const pool = new Set(themeMotifPool(layout.themeId));
  const palette: Partial<Palette> = {};
  for (const key of PALETTE_KEYS) {
    const v = parsed.palette?.[key];
    if (isHex(v)) palette[key] = sanitizeHex(v, layout.palette[key]);
  }
  const motifs = (parsed.motifs ?? []).filter((m) => pool.has(m));
  return {
    colorwayName: parsed.colorwayName || undefined,
    mood: parsed.mood || undefined,
    rationale: parsed.rationale || undefined,
    palette: Object.keys(palette).length ? palette : undefined,
    // never let the AI strip a template down to nothing
    motifs: motifs.length >= 2 ? motifs : undefined,
    headlineStyle: parsed.headlineStyle,
    photoFilter: parsed.photoFilter,
    taglines: (parsed.taglines ?? []).map((t) => cleanText(t)).filter((t) => t.length >= 2 && t.length <= 90).slice(0, 4),
  };
}

async function getSchemeBase(
  input: ArtDirectionInput,
  tone: string,
): Promise<{ scheme: SchemeBase; called: boolean; usage: AiUsage; latencyMs: number; model: string; prompt: string } | null> {
  const key = `scheme:v1:${input.templateId}:${input.variant}:${layoutFingerprint(input.layout, tone)}`;
  const cached = await cacheGet<SchemeBase>(key);
  if (cached) return { scheme: cached, called: false, usage: emptyUsage(), latencyMs: 0, model: "", prompt: "" };
  if (!geminiEnabled()) return null;

  const occasion = getOccasion(input.formData.occasion);
  const pool = themeMotifPool(input.layout.themeId);
  const earlier = await cacheList<SchemeBase>(`scheme:v1:${input.templateId}:`, 8);
  const avoid = earlier.map((s) => ({ name: s.colorwayName, bgFrom: s.palette?.bgFrom, accent: s.palette?.accent }));

  const user = JSON.stringify(
    {
      occasion: { id: occasion.id, english: occasion.en, bangla: occasion.bn },
      tone,
      template: { title: input.templateTitle, theme: input.layout.themeId },
      defaultPalette: input.layout.palette,
      availableMotifs: pool,
      defaultMotifs: input.layout.motifs,
      headlineStyles: HEADLINE_STYLES,
      photoFilters: PHOTO_FILTERS,
      variantIndex: input.variant,
      avoid,
    },
    null,
    1,
  );

  const res = await generateJson({
    system: SCHEME_SYSTEM,
    parts: [{ text: `Design colourway #${input.variant + 1} for this template.\n\n${user}` }],
    schema: SCHEME_SCHEMA,
    temperature: 0.95,
    maxOutputTokens: 1800,
  });
  const scheme = sanitiseScheme(res.data, input.layout);
  await cacheSet("scheme", key, scheme, { model: res.model, tokens: res.usage.total });
  return { scheme, called: true, usage: res.usage, latencyMs: res.latencyMs, model: res.model, prompt: `[scheme] ${user}` };
}

/** Curated, deterministic scheme — used whenever Gemini is unavailable. The variant simply walks the template's colourways. */
export function fallbackScheme(layout: LayoutConfig, occasionId: string, variant: number): PosterScheme {
  const occasion = getOccasion(occasionId);
  const cw = layout.colorways[((variant % layout.colorways.length) + layout.colorways.length) % layout.colorways.length];
  return {
    source: "fallback",
    variant,
    colorwayName: cw?.name,
    mood: layout.tone ?? occasion.tone,
    rationale: `A curated “${cw?.name ?? "classic"}” colourway for the ${occasion.en} template. Connect Gemini (GEMINI_API_KEY) to have the AI art-direct a fresh palette for every variant.`,
    taglines: occasion.subheadlines,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. Photos
 * ──────────────────────────────────────────────────────────────────────────── */

interface FocusRecord {
  box_2d: number[];
  flags: string[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function focusFromBox(box: number[] | undefined): Focus | null {
  if (!box || box.length !== 4) return null;
  const [ymin, xmin, ymax, xmax] = box.map((n) => clamp(Number(n) / 1000, 0, 1)) as [number, number, number, number];
  if (!(ymax > ymin) || !(xmax > xmin)) return null;
  const faceH = ymax - ymin;
  return {
    x: (xmin + xmax) / 2,
    y: (ymin + ymax) / 2,
    // small faces get zoomed in so they read clearly on a poster; big faces are left alone
    zoom: faceH < 0.3 ? clamp(0.3 / faceH, 1, 1.9) : 1,
  };
}

async function analysePhotos(
  photos: ArtDirectionInput["photos"],
): Promise<{ focus: Array<Focus | null>; flags: string[]; called: boolean; usage: AiUsage; latencyMs: number; model: string; prompt: string } | null> {
  if (!photos.length) return { focus: [], flags: [], called: false, usage: emptyUsage(), latencyMs: 0, model: "", prompt: "" };

  const records: Array<FocusRecord | null> = await Promise.all(photos.map((p) => cacheGet<FocusRecord>(`focus:v1:${p.hash}`)));
  const missing = records.map((r, i) => (r ? -1 : i)).filter((i) => i >= 0);
  let usage = emptyUsage();
  let latencyMs = 0;
  let model = "";
  let prompt = "";
  let called = false;

  if (missing.length && geminiEnabled()) {
    const parts = [
      { text: `Analyse these ${missing.length} photo(s). Return one entry per photo, using the index shown in each caption.` },
      ...missing.flatMap((idx, n) => [
        { text: `Photo index ${n}:` },
        { inlineData: { mimeType: "image/jpeg", data: photos[idx]!.thumb.toString("base64") } },
      ]),
    ];
    const res = await generateJson({ system: FOCUS_SYSTEM, parts, schema: FOCUS_SCHEMA, temperature: 0.1, maxOutputTokens: 800 });
    called = true;
    usage = res.usage;
    latencyMs = res.latencyMs;
    model = res.model;
    prompt = `[photo-focus] ${missing.length} image(s) analysed for face box + safety flags`;
    const list = (res.data as { photos?: Array<{ index: number; box_2d?: number[]; flags?: string[] }> }).photos ?? [];
    for (const entry of list) {
      const idx = missing[entry.index];
      if (idx === undefined) continue;
      const rec: FocusRecord = { box_2d: Array.isArray(entry.box_2d) ? entry.box_2d.slice(0, 4) : [], flags: (entry.flags ?? []).filter((f) => typeof f === "string") };
      records[idx] = rec;
      await cacheSet("focus", `focus:v1:${photos[idx]!.hash}`, rec, { model: res.model, tokens: Math.round(res.usage.total / missing.length) });
    }
  }

  const flags = new Set<string>();
  const focus = records.map((r) => {
    r?.flags?.forEach((f) => flags.add(f));
    return r ? focusFromBox(r.box_2d) : null;
  });
  return { focus, flags: [...flags], called, usage, latencyMs, model, prompt };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. Backdrop plate
 * ──────────────────────────────────────────────────────────────────────────── */

async function getBackdrop(
  input: ArtDirectionInput,
  scheme: PosterScheme,
  tone: string,
): Promise<{ url?: string; called: boolean; usage: AiUsage; latencyMs: number; prompt: string }> {
  const key = `backdrop:v1:${input.templateId}:${input.variant}:${layoutFingerprint(input.layout, tone)}`;
  const cached = await cacheGet<{ url: string }>(key);
  if (cached?.url) return { url: cached.url, called: false, usage: emptyUsage(), latencyMs: 0, prompt: "" };

  const occasion = getOccasion(input.formData.occasion);
  const p = { ...input.layout.palette, ...(scheme.palette ?? {}) };
  const prompt = backdropPrompt({
    occasionEn: occasion.en,
    tone,
    palette: [p.bgFrom, p.bgTo, p.accent, p.secondary],
    themeHint: input.layout.themeId,
  });
  const img = await generateImage({ prompt, aspectRatio: "3:4", imageSize: "1K" });
  const jpg = await sharp(img.buffer).resize(1200, 1600, { fit: "cover" }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  const stored = await getStorage().save({
    buffer: jpg,
    folder: "backdrops",
    filename: `${input.templateId}-v${input.variant}-${sha(key).slice(0, 8)}.jpg`,
    contentType: "image/jpeg",
  });
  await cacheSet("backdrop", key, { url: stored.url }, { model: img.model, tokens: img.usage.total });
  return { url: stored.url, called: true, usage: img.usage, latencyMs: img.latencyMs, prompt: `[backdrop] ${prompt}` };
}
