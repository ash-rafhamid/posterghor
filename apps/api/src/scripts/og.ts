/**
 * Renders the 1200×630 social-share card (apps/web/public/og.jpg) with headless Chrome so the Bangla wordmark is set
 * in a real font. Uses the sample posters from apps/web/public/samples (run `npm run samples` first) and the same
 * "rickshaw enamel" look as the site: ultramarine panel, striped awning, painted lettering, a poster in a lit frame.
 *
 *   npx tsx src/scripts/og.ts
 */
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import puppeteer from "puppeteer";

const require = createRequire(import.meta.url);
const web = path.resolve(process.cwd(), "../web/public");
const data = async (file: string, mime: string) => `data:${mime};base64,${(await fs.readFile(file)).toString("base64")}`;
const sample = (slug: string) => data(path.join(web, "samples", `${slug}.jpg`), "image/jpeg");

// Baloo Da 2 ExtraBold, Bengali + Latin subsets (from @fontsource, already a dependency of the web app)
const baloo = async (subset: "bengali" | "latin", range: string) =>
  `@font-face{font-family:'Baloo';font-weight:800;src:url(${await data(require.resolve(`@fontsource/baloo-da-2/files/baloo-da-2-${subset}-800-normal.woff2`), "font/woff2")}) format('woff2');unicode-range:${range}}`;
const faces = (
  await Promise.all([
    baloo("bengali", "U+0964-0965,U+0980-09FF,U+200C-200D,U+20B9,U+25CC"),
    baloo("latin", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"),
  ])
).join("\n");

const pattern = await data(path.join(web, "art", "pattern.svg"), "image/svg+xml");
const [tribute, victory, eid] = await Promise.all([sample("nirob-shraddha"), sample("bijoy-gourab"), sample("eid-mubarak")]);

// awning: pink / white scallops with a gold bead on each
const awning = (() => {
  const stripe = 44;
  const shapes = Array.from({ length: Math.ceil(1200 / stripe) + 1 }, (_, i) => {
    const x = i * stripe;
    const fill = i % 2 ? "#ffffff" : "#ff3d86";
    return `<path d="M${x} -3H${x + stripe}V14A22 22 0 0 1 ${x} 14Z" fill="${fill}" stroke="#1b1147" stroke-width="3" stroke-linejoin="round"/><circle cx="${x + 22}" cy="37" r="3.6" fill="#ffbd1a" stroke="#1b1147" stroke-width="2"/>`;
  }).join("");
  return `<svg width="1200" height="46" viewBox="0 0 1200 46" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`;
})();

const html = `<!doctype html><meta charset="utf-8"><style>
${faces}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;position:relative;overflow:hidden;font-family:'Baloo',sans-serif;background:#2a35d6 url(${pattern}) 0 0/168px 168px;color:#fff}
.awning{position:absolute;left:0;top:0;width:1200px}
.paint{color:#fff;-webkit-text-stroke:.16em #1b1147;paint-order:stroke fill;stroke-linejoin:round;text-shadow:.05em .07em 0 #1b1147,.09em .13em 0 #ff3d86}
.left{position:absolute;left:64px;top:108px;width:560px}
.tag{display:inline-block;font-weight:800;font-size:17px;color:#1b1147;background:#fff;border:3px solid #1b1147;border-radius:999px;padding:3px 16px;transform:rotate(-1.5deg)}
h1{font-weight:800;font-size:116px;line-height:1.16;margin-top:22px}
h1 span{color:#ffbd1a;--gold:1}
.sub{font-weight:800;font-size:36px;line-height:1.25;margin-top:14px;max-width:540px;text-shadow:2px 3px 0 #1b1147}
.sub b{color:#ffbd1a}
.sun{position:absolute;left:672px;top:92px;width:420px;height:420px;border-radius:50%;background:#ffbd1a;border:3px solid #1b1147;box-shadow:inset 0 0 0 12px rgba(255,255,255,.28)}
.print{position:absolute;border:3px solid #1b1147;border-radius:10px;background:#fff;padding:6px;box-shadow:0 26px 30px -18px rgba(6,8,70,.85)}
.print img{display:block;width:100%;border-radius:5px}
.p1{left:664px;top:206px;width:214px;transform:rotate(-9deg)}
.p3{left:944px;top:176px;width:214px;transform:rotate(8deg)}
.hoard{position:absolute;left:734px;top:90px;width:292px;transform:rotate(-1.5deg);padding:20px;background:#ff3d86;border:3px solid #1b1147;border-radius:24px;box-shadow:0 30px 40px -24px rgba(6,8,70,.9)}
.hoard .in{border:3px solid #1b1147;border-radius:9px;overflow:hidden;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.9)}
.hoard img{display:block;width:100%}
.bulb{position:absolute;inset:5px;pointer-events:none}
.bulb i{position:absolute;display:block}
.bulb .h{left:0;right:0;height:10px;background-size:22px 10px;background-repeat:repeat-x;background-image:radial-gradient(circle at 5px 5px,#fff 0 1.4px,#ffbd1a 2px 4px,transparent 4.6px)}
.bulb .v{top:0;bottom:0;width:10px;background-size:10px 22px;background-repeat:repeat-y;background-image:radial-gradient(circle at 5px 5px,#fff 0 1.4px,#ffbd1a 2px 4px,transparent 4.6px)}
</style>
<div class="awning">${awning}</div>
<div class="left">
  <span class="tag">AI-assisted · Bangla-perfect · Print-ready</span>
  <h1 class="paint">পোস্টারঘর</h1>
  <p class="sub">Print-ready <b>Bangla</b> posters, art‑directed by AI.</p>
</div>
<div class="sun"></div>
<div class="print p1"><img src="${tribute}"></div>
<div class="print p3"><img src="${eid}"></div>
<div class="hoard"><span class="bulb"><i class="h" style="top:0"></i><i class="h" style="bottom:0"></i><i class="v" style="left:0"></i><i class="v" style="right:0"></i></span><div class="in"><img src="${victory}"></div></div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate("document.fonts.ready.then(() => true)");
  await page.screenshot({ path: path.join(web, "og.jpg") as `${string}.jpg`, type: "jpeg", quality: 90 });
  console.log("✔ apps/web/public/og.jpg");
} finally {
  await browser.close();
}
