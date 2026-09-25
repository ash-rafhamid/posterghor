/**
 * Poster font catalog.
 *
 * Every poster is rendered with real web fonts (never system fonts) so that Bangla shaping is identical in the
 * live preview (browser) and in the print render (headless Chrome on the server).
 * Font binaries come from the @fontsource packages.
 */

export type FontSubset = "bengali" | "latin";

export interface FontFile {
  weight: number;
  style: "normal" | "italic";
  subset: FontSubset;
  /** File name inside `<pkg>/files/`. */
  file: string;
}

export interface FontDef {
  id: string;
  /** English label for the picker */
  label: string;
  /** Bangla label for the picker */
  labelBn: string;
  /** Short mood description (EN) */
  vibe: string;
  family: string;
  /** npm package that ships the files */
  pkg: string;
  role: "display" | "text";
  /** Weights we ship (headline / body pick from these) */
  weights: number[];
  /** Weight used by default for headlines */
  defaultWeight: number;
  /** Rough average advance width of a Bangla cluster, in em — used for the first-pass fit estimate */
  avgAdvance: number;
  files: FontFile[];
}

/** Unicode ranges copied from fontsource so the browser only fetches the subset it needs. */
export const UNICODE_RANGE: Record<FontSubset, string> = {
  bengali:
    "U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0,U+1CD2,U+1CD5-1CD6,U+1CD8,U+1CE1,U+1CEA,U+1CED,U+1CF2,U+1CF5-1CF7,U+200C-200D,U+20B9,U+25CC,U+A8F1",
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
};

function files(slug: string, weights: number[], styles: Array<"normal" | "italic"> = ["normal"]): FontFile[] {
  const out: FontFile[] = [];
  for (const weight of weights) {
    for (const style of styles) {
      for (const subset of ["bengali", "latin"] as const) {
        out.push({ weight, style, subset, file: `${slug}-${subset}-${weight}-${style}.woff2` });
      }
    }
  }
  return out;
}

export const FONTS: FontDef[] = [
  {
    id: "anek",
    label: "Modern Bold",
    labelBn: "আধুনিক বোল্ড",
    vibe: "Sturdy, contemporary — great for rallies & campaigns",
    family: "Anek Bangla",
    pkg: "@fontsource/anek-bangla",
    role: "display",
    weights: [500, 700, 800],
    defaultWeight: 800,
    avgAdvance: 0.62,
    files: files("anek-bangla", [500, 700, 800]),
  },
  {
    id: "baloo",
    label: "Banner",
    labelBn: "ব্যানার",
    vibe: "Chunky, friendly — the classic street-banner look",
    family: "Baloo Da 2",
    pkg: "@fontsource/baloo-da-2",
    role: "display",
    weights: [600, 800],
    defaultWeight: 800,
    avgAdvance: 0.6,
    files: files("baloo-da-2", [600, 800]),
  },
  {
    id: "serif",
    label: "Classic Serif",
    labelBn: "ক্লাসিক সেরিফ",
    vibe: "Formal and dignified — tributes & official notices",
    family: "Noto Serif Bengali",
    pkg: "@fontsource/noto-serif-bengali",
    role: "display",
    weights: [500, 700, 900],
    defaultWeight: 800,
    avgAdvance: 0.66,
    files: files("noto-serif-bengali", [500, 700, 900]),
  },
  {
    id: "tiro",
    label: "Elegant",
    labelBn: "সুললিত",
    vibe: "Literary and refined — soft, respectful tone",
    family: "Tiro Bangla",
    pkg: "@fontsource/tiro-bangla",
    role: "display",
    weights: [400],
    defaultWeight: 400,
    avgAdvance: 0.6,
    files: files("tiro-bangla", [400]),
  },
  {
    id: "galada",
    label: "Brush Script",
    labelBn: "তুলির আঁচড়",
    vibe: "Hand-painted flourish — greetings & festivals",
    family: "Galada",
    pkg: "@fontsource/galada",
    role: "display",
    weights: [400],
    defaultWeight: 400,
    avgAdvance: 0.56,
    files: files("galada", [400]),
  },
  {
    id: "atma",
    label: "Playful",
    labelBn: "হাসিখুশি",
    vibe: "Rounded and cheerful — celebrations & wishes",
    family: "Atma",
    pkg: "@fontsource/atma",
    role: "display",
    weights: [500, 700],
    defaultWeight: 700,
    avgAdvance: 0.6,
    files: files("atma", [500, 700]),
  },
  {
    id: "hind",
    label: "Hind Siliguri",
    labelBn: "হিন্দ শিলিগুড়ি",
    vibe: "Clean, highly legible text face",
    family: "Hind Siliguri",
    pkg: "@fontsource/hind-siliguri",
    role: "text",
    weights: [500, 600, 700],
    defaultWeight: 600,
    avgAdvance: 0.58,
    files: files("hind-siliguri", [500, 600, 700]),
  },
  {
    id: "noto-sans",
    label: "Noto Sans Bengali",
    labelBn: "নোটো সানস",
    vibe: "Neutral, wide language coverage",
    family: "Noto Sans Bengali",
    pkg: "@fontsource/noto-sans-bengali",
    role: "text",
    weights: [500, 700, 800],
    defaultWeight: 700,
    avgAdvance: 0.6,
    files: files("noto-sans-bengali", [500, 700, 800]),
  },
];

export const FONT_IDS = FONTS.map((f) => f.id) as [string, ...string[]];
export const DISPLAY_FONTS = FONTS.filter((f) => f.role === "display");
export const DEFAULT_HEADLINE_FONT = "anek";
export const DEFAULT_BODY_FONT = "hind";

export function getFont(id: string | undefined): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS.find((f) => f.id === DEFAULT_HEADLINE_FONT)!;
}

/** All distinct (package, file) pairs — used by the web app to copy fonts into /public/fonts. */
export function allFontFiles(): Array<{ pkg: string; file: string }> {
  return FONTS.flatMap((f) => f.files.map((x) => ({ pkg: f.pkg, file: x.file })));
}

/**
 * Builds @font-face CSS for the given fonts. `urlFor` decides how a file is referenced:
 *  - browser: `/fonts/<file>`
 *  - server:  a `data:font/woff2;base64,…` URI (fully self-contained render, no network)
 * Only the weights listed in `weights` (per font id) are emitted, to keep the payload small.
 */
export function buildFontFaceCss(
  needs: Array<{ id: string; weights?: number[] }>,
  urlFor: (file: string, def: FontDef) => string,
): string {
  const seen = new Set<string>();
  const css: string[] = [];
  for (const need of needs) {
    const def = getFont(need.id);
    const wanted = need.weights?.length ? need.weights : [def.defaultWeight];
    for (const f of def.files) {
      if (!wanted.includes(f.weight)) continue;
      const key = `${def.id}:${f.file}`;
      if (seen.has(key)) continue;
      seen.add(key);
      css.push(
        `@font-face{font-family:'${def.family}';font-style:${f.style};font-weight:${f.weight};font-display:block;` +
          `src:url(${urlFor(f.file, def)}) format('woff2');unicode-range:${UNICODE_RANGE[f.subset]};}`,
      );
    }
  }
  return css.join("\n");
}
