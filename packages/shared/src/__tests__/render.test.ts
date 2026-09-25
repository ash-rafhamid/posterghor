import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PosterCanvas } from "../poster/engine";
import { TEMPLATE_PRESETS, demoContent } from "../poster/presets";
import { resolvePoster } from "../poster/resolve";
import type { PosterContent } from "../poster/types";

const html = (resolved: ReturnType<typeof resolvePoster>) =>
  renderToStaticMarkup(createElement(PosterCanvas, { resolved, fontUrl: (file) => `/fonts/${file}`, uid: "t" }));

describe("server-side poster markup", () => {
  it("renders every template × photo count × colourway without broken numbers", () => {
    for (const preset of TEMPLATE_PRESETS) {
      const layout = preset.layoutConfig;
      for (const photos of [1, 2, 3]) {
        for (const variant of [0, 1, layout.colorways.length - 1]) {
          const resolved = resolvePoster({ layout, content: demoContent(layout, preset.occasionType, { photos }), variant });
          const out = html(resolved);
          const where = `${preset.slug} · ${photos} photo(s) · variant ${variant}`;
          assert.ok(out.length > 5_000, `${where}: suspiciously small output`);
          assert.ok(!/NaN|Infinity|undefined|\[object/.test(out), `${where}: contains a bad value → ${/.{30}(NaN|Infinity|undefined|\[object).{30}/.exec(out)?.[0]}`);
          assert.ok(out.includes(resolved.content.name), `${where}: name missing`);
        }
      }
    }
  });

  it("puts every uploaded photo on the poster", () => {
    const preset = TEMPLATE_PRESETS[0]!;
    const resolved = resolvePoster({ layout: preset.layoutConfig, content: demoContent(preset.layoutConfig, preset.occasionType, { photos: 3 }) });
    const imgs = html(resolved).match(/<img\b/g)?.length ?? 0;
    assert.ok(imgs >= 3, `expected ≥3 <img>, got ${imgs}`);
  });

  it("escapes hostile text and ignores hostile colours (the page is printed by a real browser)", () => {
    const preset = TEMPLATE_PRESETS[0]!;
    const base = demoContent(preset.layoutConfig, preset.occasionType, { photos: 1 });
    const evil = `<img src=x onerror=alert(1)><script>alert(2)</script>"'&`;
    const content: PosterContent = { ...base, headline: evil, name: evil, subheadline: evil, party: evil, photos: [{ ...base.photos[0]!, caption: evil }] };
    const resolved = resolvePoster({
      layout: preset.layoutConfig,
      content,
      scheme: {
        source: "gemini",
        variant: 0,
        palette: { bgFrom: "red;}</style><script>alert(3)</script>", accent: "url(https://evil.example/x)", headline: "#12345" },
      },
    });
    const out = html(resolved);
    assert.ok(!out.includes("<script"), "no script element");
    assert.ok(!/<img src=x/.test(out), "user text must not become markup");
    assert.ok(!out.includes("evil.example"), "colour values can't smuggle URLs");
    assert.ok(!out.includes("alert(3)"), "colour values can't break out of the stylesheet");
    assert.ok(out.includes("&lt;img src=x"), "user text is still shown — escaped");
  });

  it("shows placeholders for empty photo slots only when asked to", () => {
    const preset = TEMPLATE_PRESETS[0]!;
    const empty = { ...demoContent(preset.layoutConfig, preset.occasionType, { photos: 1 }), photos: [] };
    const resolved = resolvePoster({ layout: preset.layoutConfig, content: empty });
    const plain = renderToStaticMarkup(createElement(PosterCanvas, { resolved, fontUrl: (f) => f, uid: "t" }));
    const studio = renderToStaticMarkup(createElement(PosterCanvas, { resolved, fontUrl: (f) => f, uid: "t", placeholders: true }));
    assert.ok(studio.length > plain.length, "placeholder artwork is added in the studio preview");
  });
});
