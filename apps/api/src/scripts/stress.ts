/** Dev tool: renders every template with maximum-length text to check the auto-fitter → .scratch/renders/stress-*.png (+ a contact sheet). */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { TEMPLATE_PRESETS, demoContent, resolvePoster } from "@poster/shared";
import { closeBrowser, renderPoster } from "../services/render/renderer";

const out = path.resolve(process.cwd(), "../../.scratch/renders");
await fs.mkdir(out, { recursive: true });
const tiles: Array<{ input: Buffer; left: number; top: number }> = [];
try {
  let i = 0;
  for (const p of TEMPLATE_PRESETS) {
    const layout = p.layoutConfig;
    const c = demoContent(layout, p.occasionType, { photos: 3 });
    c.headline = "মহান বিজয় দিবসের শুভেচ্ছা ও অভিনন্দন জানাই সকল মুক্তিযোদ্ধা ও শহীদদের প্রতি";
    c.subheadline = "১৬ ডিসেম্বর ১৯৭১ — লাল-সবুজের গৌরবের দিনে সকল শহীদ ও বীর মুক্তিযোদ্ধাদের প্রতি বিনম্র শ্রদ্ধা";
    c.name = "আলহাজ্ব মোহাম্মদ আব্দুর রহমান চৌধুরী";
    c.designation = "সভাপতি, ৫নং ওয়ার্ড কমিটি ও সদস্য, উপজেলা পরিষদ";
    c.party = "বাংলাদেশ গণকল্যাণ ও উন্নয়ন সংঘ কেন্দ্রীয় কমিটি";
    c.union = "৫নং দক্ষিণ পূর্ব ইউনিয়ন"; c.thana = "নেত্রকোণা সদর থানা"; c.district = "ময়মনসিংহ বিভাগ ও জেলা";
    c.dateText = "১৬ ডিসেম্বর ২০২৬ ইং (মহান বিজয় দিবস)";
    c.photos.forEach((ph, k) => { ph.caption = ["আলহাজ্ব মোহাম্মদ করিম উদ্দিন আহমেদ", "সাবিনা ইয়াসমিন", "মোঃ রফিকুল ইসলাম খান"][k]; ph.subcaption = "কেন্দ্রীয় কমিটির সাংগঠনিক সম্পাদক"; });
    const { png } = await renderPoster(resolvePoster({ layout, content: c, variant: 0 }), { scale: 1 });
    await fs.writeFile(path.join(out, `stress-${p.slug}.png`), png);
    tiles.push({ input: await sharp(png).resize(480, 640).toBuffer(), left: (i % 3) * 480, top: Math.floor(i / 3) * 640 });
    i++;
  }
} finally { await closeBrowser(); }
await sharp({ create: { width: 1440, height: 1280, channels: 3, background: "#222" } }).composite(tiles).png().toFile(path.join(out, "_stress.png"));
console.log("stress sheet ok");
