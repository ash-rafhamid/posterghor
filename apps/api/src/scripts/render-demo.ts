/**
 * Dev tool: renders every template preset with demo content to PNGs in <repo>/.scratch/renders.
 *   npx tsx src/scripts/render-demo.ts [--only=slug] [--variant=0] [--photos=3] [--scale=1]
 */
import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { TEMPLATE_PRESETS, demoContent, fitPosterText, resolvePoster } from "@poster/shared";
import { renderPosterHtml } from "@poster/shared/node";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const only = args.only as string | undefined;
const variant = Number(args.variant ?? 0);
const photos = Number(args.photos ?? 3);
const scale = Number(args.scale ?? 1);
const outDir = path.resolve(process.cwd(), "../../.scratch/renders");

await fs.mkdir(outDir, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--font-render-hinting=none"] });

try {
  for (const preset of TEMPLATE_PRESETS) {
    if (only && preset.slug !== only) continue;
    const layout = preset.layoutConfig;
    const content = demoContent(layout, preset.occasionType, { photos });
    const resolved = resolvePoster({ layout, content, variant });
    const html = renderPosterHtml(resolved);
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: scale });
    const t0 = Date.now();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate("document.fonts.ready.then(() => true)");
    // esbuild's keepNames (tsx) wraps functions in __name(); shim it inside the page before running the fitter.
    await page.evaluate(`window.__name = window.__name || function(t){return t}; (${fitPosterText.toString()})(document)`);
    const file = path.join(outDir, `${preset.slug}-v${variant}-p${photos}.png`);
    await page.screenshot({ path: file as `${string}.png`, type: "png", clip: { x: 0, y: 0, width: 1200, height: 1600 } });
    await page.close();
    console.log(`✔ ${preset.slug} v${variant} → ${file} (${Date.now() - t0}ms)`);
  }
} finally {
  await browser.close();
}
