/** Dev tool: builds a contact sheet of the latest demo renders → .scratch/renders/_montage.png */
import path from "node:path";
import sharp from "sharp";
import { TEMPLATE_PRESETS } from "@poster/shared";

const dir = path.resolve(process.cwd(), "../../.scratch/renders");
const variant = process.argv[2] ?? "0";
const photos = process.argv[3] ?? "3";
const cols = 3;
const w = 480;
const h = 640;
const presets = TEMPLATE_PRESETS;
const rows = Math.ceil(presets.length / cols);

const tiles = await Promise.all(
  presets.map(async (p, i) => ({
    input: await sharp(path.join(dir, `${p.slug}-v${variant}-p${photos}.png`)).resize(w, h).toBuffer(),
    left: (i % cols) * w,
    top: Math.floor(i / cols) * h,
  })),
);

await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: "#222" } })
  .composite(tiles)
  .png()
  .toFile(path.join(dir, "_montage.png"));
console.log("montage ok");
