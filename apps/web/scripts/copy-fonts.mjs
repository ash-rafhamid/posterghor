/**
 * Copies the poster fonts (the exact files the print renderer embeds) into public/fonts so the live preview in the
 * browser typesets Bangla with the same font binaries as the server render.
 *
 * The list comes straight from the shared font catalog (packages/shared/src/fonts.ts), read via Node's built-in
 * TypeScript type stripping — no extra tooling needed.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const out = path.resolve(here, "../public/fonts");
fs.mkdirSync(out, { recursive: true });

const { allFontFiles } = await import("../../../packages/shared/src/fonts.ts");

let copied = 0;
let skipped = 0;
for (const { pkg, file } of allFontFiles()) {
  const dest = path.join(out, file);
  if (fs.existsSync(dest)) {
    skipped++;
    continue;
  }
  const pkgDir = path.dirname(require.resolve(`${pkg}/package.json`));
  fs.copyFileSync(path.join(pkgDir, "files", file), dest);
  copied++;
}
console.log(`[fonts] ${copied} copied, ${skipped} already present → public/fonts`);
