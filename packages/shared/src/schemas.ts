import { z } from "zod";
import { cleanText, toLatinDigits } from "./bangla";
import { BULK_MAX_ROWS, FRAME_STYLES, MAX_PHOTOS, OCCASION_IDS, PHOTO_LAYOUTS } from "./constants";
import { FONT_IDS } from "./fonts";

/* ────────────────────────────────────────────────────────────────────────────
 * Text primitives — every user string is cleaned (control chars removed, whitespace collapsed)
 * ──────────────────────────────────────────────────────────────────────────── */

const clean = (v: unknown) => (typeof v === "string" ? cleanText(v) : v == null ? "" : v);

/** Optional short text. Missing → "" */
const optText = (max: number) => z.preprocess(clean, z.string().max(max, `Keep this under ${max} characters`)).default("");

/** Required text */
const reqText = (min: number, max: number, label: string) =>
  z.preprocess(
    clean,
    z
      .string()
      .min(min, `${label} is required`)
      .max(max, `${label} must be under ${max} characters`),
  );

/* ────────────────────────────────────────────────────────────────────────────
 * Identifiers (email or Bangladeshi mobile number)
 * ──────────────────────────────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BD_PHONE_RE = /^(?:\+?88)?(01[3-9]\d{8})$/;

export type Identifier = { kind: "email"; value: string } | { kind: "phone"; value: string };

/** Accepts an email or a Bangladeshi mobile (01XXXXXXXXX / +8801XXXXXXXXX, Bangla digits ok). */
export function parseIdentifier(input: string): Identifier | null {
  const raw = toLatinDigits(String(input ?? "")).trim();
  if (!raw) return null;
  if (raw.includes("@")) {
    return EMAIL_RE.test(raw) ? { kind: "email", value: raw.toLowerCase() } : null;
  }
  const digits = raw.replace(/[\s\-().]/g, "");
  const m = BD_PHONE_RE.exec(digits);
  return m ? { kind: "phone", value: `+88${m[1]}` } : null;
}

const identifier = z
  .string()
  .trim()
  .min(3, "Enter your email or mobile number")
  .max(120)
  .refine((v) => parseIdentifier(v) !== null, "Enter a valid email or a Bangladeshi mobile number (01XXXXXXXXX)");

export const registerSchema = z.object({
  name: reqText(2, 60, "Name"),
  identifier,
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier,
  password: z.string().min(1, "Enter your password").max(100),
});
export type LoginInput = z.infer<typeof loginSchema>;

/* ────────────────────────────────────────────────────────────────────────────
 * Poster form
 * ──────────────────────────────────────────────────────────────────────────── */

export const posterPhotoSchema = z.object({
  url: z.string().url("Invalid photo URL").max(1200),
  caption: optText(60),
  subcaption: optText(70),
});

export const posterFormSchema = z.object({
  occasion: z.enum(OCCASION_IDS),
  headline: reqText(2, 90, "Headline"),
  subheadline: optText(140),
  name: reqText(2, 70, "Name"),
  designation: optText(70),
  party: optText(80),
  union: optText(50),
  thana: optText(50),
  district: optText(50),
  creditLabel: optText(24),
  dateText: optText(40),
  photos: z.array(posterPhotoSchema).max(MAX_PHOTOS, `Up to ${MAX_PHOTOS} photos`).default([]),
  headlineFont: z.enum(FONT_IDS).optional(),
  frame: z.enum(FRAME_STYLES).default("auto"),
  photoLayout: z.enum(PHOTO_LAYOUTS).default("auto"),
  /** "auto" → Gemini art-directs the colour scheme; otherwise the id of one of the template's curated colourways */
  palette: z.string().max(40).default("auto"),
  useAiBackdrop: z.boolean().default(false),
});

export type PosterFormData = z.infer<typeof posterFormSchema>;
export type PosterFormInput = z.input<typeof posterFormSchema>;

export const createPosterSchema = z.object({
  templateId: z.string().min(1, "Choose a template"),
  formData: posterFormSchema,
  /** the person confirms they may use these photos / are responsible for the content */
  consent: z.literal(true, { error: "Please confirm you have the right to use these photos and text" }),
});
export type CreatePosterInput = z.infer<typeof createPosterSchema>;

/**
 * Bulk generation: one template + shared content/photos/style (`base`), and one row of per-person fields per poster.
 * Rows override `base` only for the fields they actually fill in; each merged form is validated on the server.
 */
export const bulkPosterSchema = z.object({
  templateId: z.string().min(1, "Choose a template"),
  consent: z.literal(true, { error: "Please confirm you have the right to use these photos and text" }),
  base: z.record(z.string(), z.unknown()),
  rows: z.array(z.record(z.string(), z.unknown())).min(1, "Add at least one row").max(BULK_MAX_ROWS, `At most ${BULK_MAX_ROWS} posters per batch`),
});
export type BulkPosterInput = z.infer<typeof bulkPosterSchema>;

export const regeneratePosterSchema = z.object({
  /**
   * Optional edits merged onto the poster's form data before regenerating (text fixes, font, frame …).
   * Kept loose on purpose: the *merged* object is validated with posterFormSchema, so partial edits can never
   * accidentally reset untouched fields to their defaults.
   */
  formData: z.record(z.string(), z.unknown()).optional(),
  /** true → re-render with the same colourway / art direction (e.g. after fixing a typo) */
  keepStyle: z.boolean().default(false),
});
export type RegeneratePosterInput = z.infer<typeof regeneratePosterSchema>;

/* ────────────────────────────────────────────────────────────────────────────
 * Templates (admin)
 * ──────────────────────────────────────────────────────────────────────────── */

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #0b6b4f");

const paletteSchema = z.object({
  bgFrom: hex,
  bgTo: hex,
  primary: hex,
  secondary: hex,
  accent: hex,
  ink: hex,
  paper: hex,
  headline: hex,
  headlineStroke: hex,
  panel: hex,
  panelText: hex,
  footer: hex,
  footerText: hex,
});

const num = z.number().finite();
const textSlotSchema = z.object({
  x: num,
  y: num,
  w: num.positive(),
  h: num.positive(),
  size: num.positive().max(400),
  minSize: num.positive().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  valign: z.enum(["top", "middle", "bottom"]).optional(),
  lineHeight: num.optional(),
  weight: num.optional(),
  color: z.string().optional(),
  font: z.enum(["headline", "body"]).optional(),
  rotate: num.optional(),
  nowrap: z.boolean().optional(),
  letterSpacing: num.optional(),
});

const photoSlotSchema = z.object({
  x: num,
  y: num,
  w: num.positive(),
  h: num.positive(),
  rotate: num.optional(),
  z: num.optional(),
  frame: z.enum(["arch", "circle", "rounded", "hex", "fade", "polaroid"]).optional(),
  noCaption: z.boolean().optional(),
});

export const layoutConfigSchema = z.object({
  version: z.literal(1),
  themeId: z.enum(["victory", "tribute", "campaign", "sunrise", "boishakh", "eid"]),
  tone: z.enum(["solemn", "triumphant", "bold", "warm", "festive", "elegant"]).optional(),
  palette: paletteSchema,
  motifs: z.array(z.string().max(30)).max(24),
  frame: z.enum(["arch", "circle", "rounded", "hex", "fade", "polaroid"]),
  photoFilter: z.enum(["none", "bw", "warm", "punch"]).optional(),
  photoLayouts: z.object({
    "1": z.array(photoSlotSchema).min(1).max(1),
    "2": z.array(photoSlotSchema).min(2).max(2),
    "3": z.array(photoSlotSchema).min(3).max(3),
  }),
  slots: z.object({
    headline: textSlotSchema,
    subheadline: textSlotSchema.optional(),
    dateText: textSlotSchema.optional(),
    creditLabel: textSlotSchema.optional(),
    plate: z.object({
      x: num,
      y: num,
      w: num.positive(),
      h: num.positive(),
      align: z.enum(["left", "center", "right"]).optional(),
      nameSize: num.positive(),
      designationSize: num.positive(),
      partySize: num.positive(),
      gap: num.optional(),
      nameColor: z.string().optional(),
      designationColor: z.string().optional(),
      subColor: z.string().optional(),
    }),
    location: textSlotSchema.optional(),
  }),
  headline: z.object({
    fontId: z.string(),
    bodyFontId: z.string().optional(),
    style: z.enum(["stroke", "gradient", "shadow", "plain", "emboss"]),
  }),
  defaults: z.object({
    headline: z.string().max(90),
    subheadline: z.string().max(140),
    creditLabel: z.string().max(24),
  }),
  colorways: z
    .array(
      z.object({
        id: z.string().max(40),
        name: z.string().max(60),
        nameBn: z.string().max(60),
        palette: paletteSchema.partial(),
        motifs: z.array(z.string().max(30)).optional(),
      }),
    )
    .min(1)
    .max(12),
});

export const templateInputSchema = z.object({
  title: reqText(2, 80, "Title"),
  titleBn: reqText(2, 80, "Bangla title"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, numbers and dashes only")
    .max(60)
    .optional(),
  description: optText(240),
  occasionType: z.enum(OCCASION_IDS),
  thumbnailUrl: z.string().url().max(1200).optional().or(z.literal("")),
  layoutConfig: layoutConfigSchema,
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(100),
});
export type TemplateInput = z.infer<typeof templateInputSchema>;

/* ────────────────────────────────────────────────────────────────────────────
 * Moderation
 * ──────────────────────────────────────────────────────────────────────────── */

export const moderationActionSchema = z.object({
  status: z.enum(["clean", "flagged", "blocked"]),
  note: z.string().trim().max(300).optional(),
});
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
