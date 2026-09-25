import type { FrameStyle, OccasionId, ToneId } from "../constants";

/* ────────────────────────────────────────────────────────────────────────────
 * Palette
 * ──────────────────────────────────────────────────────────────────────────── */

export interface Palette {
  /** background gradient, top */
  bgFrom: string;
  /** background gradient, bottom */
  bgTo: string;
  /** dominant brand colour (Bangladesh green, mourning black …) */
  primary: string;
  /** second brand colour (flag red …) */
  secondary: string;
  /** highlights / rules / gold */
  accent: string;
  /** darkest colour — text on light surfaces */
  ink: string;
  /** lightest colour — text on dark surfaces */
  paper: string;
  headline: string;
  headlineStroke: string;
  /** name-plate surface */
  panel: string;
  panelText: string;
  /** footer bar */
  footer: string;
  footerText: string;
}

export const PALETTE_KEYS: Array<keyof Palette> = [
  "bgFrom",
  "bgTo",
  "primary",
  "secondary",
  "accent",
  "ink",
  "paper",
  "headline",
  "headlineStroke",
  "panel",
  "panelText",
  "footer",
  "footerText",
];

/* ────────────────────────────────────────────────────────────────────────────
 * Layout config (stored on Template.layoutConfig)
 * ──────────────────────────────────────────────────────────────────────────── */

export type ThemeId = "victory" | "tribute" | "campaign" | "sunrise" | "boishakh" | "eid";
export type RealFrame = Exclude<FrameStyle, "auto">;
export type HeadlineStyle = "stroke" | "gradient" | "shadow" | "plain" | "emboss";
export type PhotoFilter = "none" | "bw" | "warm" | "punch";
export type PhotoCount = "1" | "2" | "3";

export interface PhotoSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  z?: number;
  frame?: RealFrame;
  /** hide the caption plate for this slot */
  noCaption?: boolean;
}

export interface TextSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  /** max font size (px) — the fitter shrinks from here */
  size: number;
  minSize?: number;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  lineHeight?: number;
  weight?: number;
  color?: keyof Palette | string;
  font?: "headline" | "body";
  rotate?: number;
  nowrap?: boolean;
  letterSpacing?: number;
}

/** The name / designation / party stack that carries the requester's identity. */
export interface PlateSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  align?: "left" | "center" | "right";
  nameSize: number;
  designationSize: number;
  partySize: number;
  gap?: number;
  nameColor?: keyof Palette | string;
  designationColor?: keyof Palette | string;
  subColor?: keyof Palette | string;
}

export interface Colorway {
  id: string;
  name: string;
  nameBn: string;
  palette: Partial<Palette>;
  motifs?: string[];
}

export interface LayoutConfig {
  version: 1;
  themeId: ThemeId;
  palette: Palette;
  /** motifs switched on by default (a subset of the theme's motif pool) */
  motifs: string[];
  frame: RealFrame;
  photoFilter?: PhotoFilter;
  photoLayouts: Record<PhotoCount, PhotoSlot[]>;
  slots: {
    headline: TextSlot;
    subheadline?: TextSlot;
    /** small badge near the top ("১৬ ডিসেম্বর ২০২৬") */
    dateText?: TextSlot;
    /** tab that carries the credit label ("প্রচারে") */
    creditLabel?: TextSlot;
    plate: PlateSlot;
    /** footer line — union · thana · district */
    location?: TextSlot;
  };
  headline: {
    fontId: string;
    bodyFontId?: string;
    style: HeadlineStyle;
  };
  defaults: {
    headline: string;
    subheadline: string;
    creditLabel: string;
  };
  colorways: Colorway[];
  /** optional — tone hint for the AI art director */
  tone?: ToneId;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Poster content (what the user typed / uploaded)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface Focus {
  /** focal point, 0..1 (left→right / top→bottom) */
  x: number;
  y: number;
  /** ≥ 1 — how much to zoom in around the focal point */
  zoom: number;
}

export interface PosterPhoto {
  /** URL, data URI, or blob URL */
  src: string;
  caption?: string;
  subcaption?: string;
  focus?: Focus | null;
  /** photo has transparency (a cut-out PNG) */
  alpha?: boolean;
}

export interface PosterContent {
  occasion: OccasionId;
  headline: string;
  subheadline?: string;
  name: string;
  designation?: string;
  party?: string;
  union?: string;
  thana?: string;
  district?: string;
  creditLabel?: string;
  dateText?: string;
  photos: PosterPhoto[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Art direction — produced by Gemini (or the deterministic fallback), stored on the poster
 * ──────────────────────────────────────────────────────────────────────────── */

export interface PosterScheme {
  source: "gemini" | "fallback";
  variant: number;
  colorwayName?: string;
  mood?: string;
  /** Short explanation shown in the UI ("Art director's note") */
  rationale?: string;
  palette?: Partial<Palette>;
  motifs?: string[];
  frame?: RealFrame;
  headlineStyle?: HeadlineStyle;
  headlineScale?: number;
  photoFilter?: PhotoFilter;
  /** one entry per uploaded photo (null = unknown) */
  photoFocus?: Array<Focus | null>;
  /** Suggested alternative Bangla taglines (never auto-applied) */
  taglines?: string[];
  /** AI-generated background plate (template-level, cached) */
  backdropUrl?: string;
}

/** What the user chose in the studio's style panel (all optional, "auto" = let the scheme decide) */
export interface StyleChoices {
  headlineFont?: string;
  frame?: FrameStyle;
  photoLayout?: "auto" | PhotoCount;
  useAiBackdrop?: boolean;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Resolved (final) style — the single input the renderer draws from
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ResolvedPoster {
  layout: LayoutConfig;
  content: PosterContent;
  palette: Palette;
  motifs: string[];
  frame: RealFrame;
  photoFilter: PhotoFilter;
  photoCount: PhotoCount;
  slots: PhotoSlot[];
  headlineFont: string;
  bodyFont: string;
  headlineStyle: HeadlineStyle;
  headlineScale: number;
  seed: number;
  backdropUrl?: string;
  colorwayName?: string;
}
