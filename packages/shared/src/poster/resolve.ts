import { ensureContrast, sanitizeHex, luminance, contrast, mix, readableOn } from "../color";
import { DEFAULT_BODY_FONT, getFont } from "../fonts";
import type {
  Focus,
  LayoutConfig,
  Palette,
  PhotoCount,
  PosterContent,
  PosterScheme,
  ResolvedPoster,
  StyleChoices,
} from "./types";
import { PALETTE_KEYS } from "./types";

/** Overlay `partial` on `base`, sanitising every colour (unknown / malformed values fall back to base). */
export function mergePalette(base: Palette, partial?: Partial<Palette>): Palette {
  const out = { ...base };
  if (!partial) return out;
  for (const key of PALETTE_KEYS) {
    const v = partial[key];
    if (v !== undefined) out[key] = sanitizeHex(v, base[key]);
  }
  return out;
}

/**
 * Guarantees the text colours in a palette stay legible, whatever the (possibly AI-chosen) background is.
 * Only text-vs-surface pairs are touched; decorative colours are left alone.
 */
export function guardPalette(p: Palette, explicit: Partial<Palette> | undefined): Palette {
  const out = { ...p };
  // Derive the "dependent" colours when an override (AI scheme / colourway) didn't set them explicitly.
  // The template's own defaults (no override at all) are trusted as-is.
  if (explicit && Object.keys(explicit).length > 0) {
    if (!explicit.panel) out.panel = mix(out.primary, "#000000", 0.35);
    if (!explicit.footer) out.footer = mix(out.bgFrom, "#000000", 0.35);
    if (!explicit.headlineStroke) {
      out.headlineStroke = luminance(out.headline) > 0.5 ? mix(out.bgFrom, "#000000", 0.55) : mix(out.paper, "#ffffff", 0.6);
    }
  }
  // Headline must contrast with its outline OR the mid-tone of the background.
  const bgMid = mix(out.bgFrom, out.bgTo, 0.5);
  const headlineVsStroke = contrast(out.headline, out.headlineStroke);
  if (headlineVsStroke < 3) {
    out.headline = ensureContrast(out.headline, bgMid, 4.5);
  }
  out.panelText = ensureContrast(out.panelText, out.panel, 5);
  out.footerText = ensureContrast(out.footerText, out.footer, 5);
  if (contrast(out.ink, out.paper) < 7) {
    out.ink = readableOn(out.paper, "#ffffff", "#141210");
  }
  return out;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function sanitizeFocus(f: Focus | null | undefined): Focus | null {
  if (!f) return null;
  const x = Number(f.x);
  const y = Number(f.y);
  const zoom = Number(f.zoom);
  if (![x, y, zoom].every(Number.isFinite)) return null;
  return { x: clamp(x, 0, 1), y: clamp(y, 0, 1), zoom: clamp(zoom, 1, 2.2) };
}

export interface ResolveInput {
  layout: LayoutConfig;
  content: PosterContent;
  scheme?: PosterScheme | null;
  choices?: StyleChoices;
  /** used when there is no scheme (or a fallback scheme) — selects a curated colourway */
  variant?: number;
}

/**
 * Merges: template defaults → colourway (variant) → art-direction scheme → the user's explicit choices.
 * Pure + deterministic — the browser preview and the server render call the same function.
 */
export function resolvePoster({ layout, content, scheme, choices, variant }: ResolveInput): ResolvedPoster {
  const v = variant ?? scheme?.variant ?? 0;
  const colorway = layout.colorways.length ? layout.colorways[((v % layout.colorways.length) + layout.colorways.length) % layout.colorways.length] : undefined;

  const useAi = scheme && scheme.source === "gemini";
  const explicit: Partial<Palette> | undefined = useAi ? scheme?.palette : colorway?.palette;
  let palette = mergePalette(layout.palette, useAi ? undefined : colorway?.palette);
  if (useAi) palette = mergePalette(palette, scheme?.palette);
  palette = guardPalette(palette, explicit);

  const themePool = layout.motifs;
  const motifs =
    (useAi && scheme?.motifs?.length ? scheme.motifs : colorway?.motifs) ?? themePool;

  // photo arrangement
  const uploaded = Math.max(1, Math.min(3, content.photos.length));
  const wanted = choices?.photoLayout && choices.photoLayout !== "auto" ? choices.photoLayout : (String(uploaded) as PhotoCount);
  const photoCount = wanted as PhotoCount;
  const slots = layout.photoLayouts[photoCount] ?? layout.photoLayouts["1"];

  const frame =
    choices?.frame && choices.frame !== "auto" ? choices.frame : (scheme?.frame ?? layout.frame);

  const headlineFont = getFont(choices?.headlineFont ?? layout.headline.fontId).id;
  const bodyFont = getFont(layout.headline.bodyFontId ?? DEFAULT_BODY_FONT).id;

  // fold AI photo focus into the photos
  const photos = content.photos.map((p, i) => ({
    ...p,
    focus: sanitizeFocus(p.focus ?? scheme?.photoFocus?.[i] ?? null),
  }));

  return {
    layout,
    content: { ...content, photos },
    palette,
    motifs,
    frame,
    photoFilter: scheme?.photoFilter ?? layout.photoFilter ?? "none",
    photoCount,
    slots,
    headlineFont,
    bodyFont,
    headlineStyle: scheme?.headlineStyle ?? layout.headline.style,
    headlineScale: clamp(scheme?.headlineScale ?? 1, 0.8, 1.12),
    seed: 4177 + v * 131,
    backdropUrl: choices?.useAiBackdrop === false ? undefined : scheme?.backdropUrl,
    colorwayName: useAi ? scheme?.colorwayName : colorway?.name,
  };
}
