import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrast, mix } from "../color";
import { POSTER_HEIGHT, POSTER_WIDTH } from "../constants";
import { DEFAULT_HEADLINE_FONT } from "../fonts";
import { TEMPLATE_PRESETS, VICTORY_LAYOUT, demoContent } from "../poster/presets";
import { resolvePoster } from "../poster/resolve";
import { getTheme, themeMotifPool } from "../poster/themes";
import { layoutConfigSchema } from "../schemas";

const content = (photos = 3) => demoContent(VICTORY_LAYOUT, "victory", { photos });

describe("template presets", () => {
  it("every seed template passes the layout schema and names a real theme", () => {
    for (const p of TEMPLATE_PRESETS) {
      const r = layoutConfigSchema.safeParse(p.layoutConfig);
      assert.ok(r.success, `${p.slug}: ${r.success ? "" : JSON.stringify(r.error.issues.slice(0, 2))}`);
      assert.equal(getTheme(p.layoutConfig.themeId).id, p.layoutConfig.themeId);
    }
  });

  it("decorations a template switches on exist in its theme", () => {
    for (const p of TEMPLATE_PRESETS) {
      const pool = new Set(themeMotifPool(p.layoutConfig.themeId));
      for (const m of p.layoutConfig.motifs) assert.ok(pool.has(m), `${p.slug} uses unknown motif “${m}”`);
      for (const cw of p.layoutConfig.colorways) for (const m of cw.motifs ?? []) assert.ok(pool.has(m), `${p.slug}/${cw.id} uses unknown motif “${m}”`);
    }
  });

  it("slugs are unique and there is a template for every kind of occasion we promise", () => {
    assert.equal(new Set(TEMPLATE_PRESETS.map((p) => p.slug)).size, TEMPLATE_PRESETS.length);
    const occasions = new Set(TEMPLATE_PRESETS.map((p) => p.occasionType));
    for (const o of ["victory", "tribute", "campaign", "greeting", "festival"]) assert.ok(occasions.has(o as never), `no template for ${o}`);
  });

  it("every photo and text slot sits inside the 1200×1600 poster", () => {
    const inside = (name: string, s: { x: number; y: number; w: number; h: number }) => {
      assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= POSTER_WIDTH && s.y + s.h <= POSTER_HEIGHT, `${name} is out of bounds: ${JSON.stringify(s)}`);
    };
    for (const p of TEMPLATE_PRESETS) {
      const l = p.layoutConfig;
      for (const [count, slots] of Object.entries(l.photoLayouts)) slots.forEach((s, i) => inside(`${p.slug} photo ${count}-up #${i + 1}`, s));
      for (const [key, slot] of Object.entries(l.slots)) if (slot) inside(`${p.slug} slot ${key}`, slot);
    }
  });
});

describe("resolvePoster", () => {
  it("picks the photo arrangement from the number of photos, unless the user forces one", () => {
    assert.equal(resolvePoster({ layout: VICTORY_LAYOUT, content: content(1) }).photoCount, "1");
    assert.equal(resolvePoster({ layout: VICTORY_LAYOUT, content: content(2) }).slots.length, 2);
    assert.equal(resolvePoster({ layout: VICTORY_LAYOUT, content: content(3) }).slots.length, 3);
    assert.equal(resolvePoster({ layout: VICTORY_LAYOUT, content: content(3), choices: { photoLayout: "1" } }).slots.length, 1);
    assert.equal(resolvePoster({ layout: VICTORY_LAYOUT, content: content(1), choices: { photoLayout: "auto" } }).photoCount, "1");
  });

  it("walks the curated colourways with the variant — and wraps around, in both directions", () => {
    const n = VICTORY_LAYOUT.colorways.length;
    const at = (variant: number) => resolvePoster({ layout: VICTORY_LAYOUT, content: content(), variant });
    assert.equal(at(0).colorwayName, "Flag Green");
    assert.notEqual(at(0).palette.bgFrom, at(1).palette.bgFrom);
    assert.equal(at(n).palette.bgFrom, at(0).palette.bgFrom);
    assert.equal(at(-1).palette.bgFrom, at(n - 1).palette.bgFrom);
    assert.notEqual(at(0).seed, at(1).seed, "each variant scatters its decorations differently");
  });

  it("leaves the template's own colours untouched when no override is requested", () => {
    const p = resolvePoster({ layout: VICTORY_LAYOUT, content: content(), variant: 0 }).palette;
    for (const key of ["bgFrom", "bgTo", "primary", "secondary", "accent", "headline"] as const) assert.equal(p[key], VICTORY_LAYOUT.palette[key], key);
  });

  it("applies an AI scheme, sanitises it, and keeps text legible", () => {
    const r = resolvePoster({
      layout: VICTORY_LAYOUT,
      content: content(),
      scheme: {
        source: "gemini",
        variant: 4,
        palette: { bgFrom: "#f5f5f5", bgTo: "#eeeeee", headline: "#f0f0f0", accent: "not-a-colour;{}" },
        motifs: ["paddy", "doves"],
        headlineStyle: "gradient",
        photoFocus: [{ x: 0.4, y: 0.3, zoom: 9 }, null, { x: 2, y: -1, zoom: 1 }],
      },
    });
    assert.equal(r.palette.bgFrom, "#f5f5f5");
    assert.equal(r.palette.accent, VICTORY_LAYOUT.palette.accent, "an invalid colour falls back to the template's");
    assert.deepEqual(r.motifs, ["paddy", "doves"]);
    assert.equal(r.headlineStyle, "gradient");
    // a pale headline on a pale background would vanish — the guard must fix the pair
    const bgMid = mix(r.palette.bgFrom, r.palette.bgTo, 0.5);
    assert.ok(Math.max(contrast(r.palette.headline, r.palette.headlineStroke), contrast(r.palette.headline, bgMid)) >= 3);
    // focus values are clamped to sane ranges
    assert.equal(r.content.photos[0]!.focus?.zoom, 2.2);
    assert.equal(r.content.photos[1]!.focus, null);
    assert.deepEqual([r.content.photos[2]!.focus?.x, r.content.photos[2]!.focus?.y], [1, 0]);
  });

  it("ignores a fallback scheme's palette (curated colourways are used instead)", () => {
    const base = resolvePoster({ layout: VICTORY_LAYOUT, content: content(), variant: 2 });
    const viaScheme = resolvePoster({ layout: VICTORY_LAYOUT, content: content(), scheme: { source: "fallback", variant: 2, palette: { bgFrom: "#ff00ff" } } });
    assert.equal(viaScheme.palette.bgFrom, base.palette.bgFrom);
  });

  it("a user-chosen headline font wins over the template's; unknown fonts fall back safely", () => {
    assert.equal(resolvePoster({ layout: VICTORY_LAYOUT, content: content(), choices: { headlineFont: "galada" } }).headlineFont, "galada");
    assert.equal(resolvePoster({ layout: VICTORY_LAYOUT, content: content(), choices: { headlineFont: "nope" } }).headlineFont, DEFAULT_HEADLINE_FONT);
  });

  it("clamps the headline scale an AI scheme can ask for", () => {
    const at = (headlineScale: number) => resolvePoster({ layout: VICTORY_LAYOUT, content: content(), scheme: { source: "gemini", variant: 0, headlineScale } }).headlineScale;
    assert.equal(at(5), 1.12);
    assert.equal(at(0.1), 0.8);
    assert.equal(at(1), 1);
  });
});

describe("colourways stay legible", () => {
  // Every curated colourway of every shipped template, with 1, 2 and 3 photos.
  for (const preset of TEMPLATE_PRESETS) {
    it(`${preset.slug}: all ${preset.layoutConfig.colorways.length} colourways meet contrast targets`, () => {
      for (let variant = 0; variant < preset.layoutConfig.colorways.length; variant++) {
        for (const photos of [1, 2, 3]) {
          const r = resolvePoster({ layout: preset.layoutConfig, content: demoContent(preset.layoutConfig, preset.occasionType, { photos }), variant });
          const p = r.palette;
          const where = `${preset.slug} · ${r.colorwayName} · ${photos} photo(s)`;
          assert.ok(contrast(p.panelText, p.panel) >= 4.5, `${where}: name plate text ${contrast(p.panelText, p.panel).toFixed(2)}:1`);
          assert.ok(contrast(p.footerText, p.footer) >= 4.5, `${where}: footer text ${contrast(p.footerText, p.footer).toFixed(2)}:1`);
          assert.ok(contrast(p.ink, p.paper) >= 7, `${where}: ink on paper`);
          const bgMid = mix(p.bgFrom, p.bgTo, 0.5);
          assert.ok(Math.max(contrast(p.headline, p.headlineStroke), contrast(p.headline, bgMid)) >= 3, `${where}: headline`);
        }
      }
    });
  }
});
