/**
 * Renders marketing / fallback sample images for every template into apps/web/public/samples.
 * The landing page uses these static files, so it never depends on the API being reachable.
 *
 *   npm run samples -w @poster/api
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { TEMPLATE_PRESETS, demoContent, resolvePoster } from "@poster/shared";
import { closeBrowser, renderPoster } from "../services/render/renderer";

const outDir = path.resolve(process.cwd(), "../web/public/samples");
await fs.mkdir(outDir, { recursive: true });

try {
  for (const preset of TEMPLATE_PRESETS) {
    for (const variant of [0, 1, 2]) {
      const layout = preset.layoutConfig;
      const content = demoContent(layout, preset.occasionType, { photos: 3 });
      const resolved = resolvePoster({ layout, content, variant });
      const { png } = await renderPoster(resolved, { scale: 1 });
      const file = path.join(outDir, `${preset.slug}${variant ? `-v${variant}` : ""}.jpg`);
      await sharp(png).resize(720, 960).jpeg({ quality: 84, mozjpeg: true }).toFile(file);
      console.log(`✔ ${path.relative(process.cwd(), file)}`);
    }
  }
} finally {
  await closeBrowser();
}
