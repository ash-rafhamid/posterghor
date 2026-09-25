/**
 * Colour helpers. All poster colours flow through `sanitizeHex` so that AI-suggested values (or anything else that
 * ends up in a stylesheet) can never inject CSS.
 */

export type RGB = { r: number; g: number; b: number };

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Returns a normalised `#rrggbb` string, or `fallback` if the input is not a valid hex colour. */
export function sanitizeHex(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const m = HEX_RE.exec(input.trim());
  if (!m) return fallback;
  let h = m[1]!.toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h}`;
}

export function isHex(input: unknown): input is string {
  return typeof input === "string" && HEX_RE.test(input.trim());
}

export function hexToRgb(hex: string): RGB {
  const h = sanitizeHex(hex, "#000000").slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Linear blend: t=0 → a, t=1 → b */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex({
    r: A.r + (B.r - A.r) * t,
    g: A.g + (B.g - A.g) * t,
    b: A.b + (B.b - A.b) * t,
  });
}

export const lighten = (hex: string, t: number) => mix(hex, "#ffffff", t);
export const darken = (hex: string, t: number) => mix(hex, "#000000", t);

/** rgba() string from a hex colour */
export function alpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

/** WCAG relative luminance */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio (1..21) */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Nudges `fg` towards white or black until it has at least `min` contrast against `bg`.
 * Used to keep AI-picked palettes legible on paper.
 */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrast(fg, bg) >= min) return fg;
  const towardsWhite = luminance(bg) < 0.4;
  const target = towardsWhite ? "#ffffff" : "#000000";
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    const c = mix(fg, target, t);
    if (contrast(c, bg) >= min) return c;
  }
  return target;
}

/** Picks whichever of `light`/`dark` reads best on `bg`. */
export function readableOn(bg: string, light = "#ffffff", dark = "#111111"): string {
  return contrast(light, bg) >= contrast(dark, bg) ? light : dark;
}

/** Average of two hex colours' perceived brightness — quick "is this a dark scheme?" test. */
export function isDark(hex: string): boolean {
  return luminance(hex) < 0.22;
}
