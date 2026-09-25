import fs from "node:fs";
import PQueue from "p-queue";
import puppeteer, { type Browser } from "puppeteer";
import { EXPORT_SCALE, POSTER_HEIGHT, POSTER_WIDTH, fitPosterText, type ResolvedPoster } from "@poster/shared";
import { renderPosterHtml } from "@poster/shared/node";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

/**
 * Print renderer — turns a resolved poster into pixels with headless Chrome.
 *
 * Why HTML → Chrome instead of asking an image model to draw the poster: Bangla conjuncts, matras and
 * kerning come out exactly as typed (HarfBuzz shaping), text is auto-fitted, and the result is sharp at any size.
 */

const CANDIDATES = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

async function resolveChrome(): Promise<string | undefined> {
  if (env.CHROME_PATH) return env.CHROME_PATH;
  try {
    const bundled = await puppeteer.executablePath();
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {
    /* fall through to system browsers */
  }
  return CANDIDATES.find((p) => fs.existsSync(p));
}

let browserPromise: Promise<Browser> | null = null;
const queue = new PQueue({ concurrency: env.RENDER_CONCURRENCY });

async function launch(): Promise<Browser> {
  const executablePath = await resolveChrome();
  logger.info(`Launching headless Chrome (${executablePath ?? "puppeteer default"})`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
      "--force-color-profile=srgb",
      "--hide-scrollbars",
      "--disable-gpu",
      // small-server mode: fewer background services and a capped JS heap inside Chrome
      ...(env.lowMemory ? ["--disable-extensions", "--disable-background-networking", "--disable-default-apps", "--mute-audio", "--renderer-process-limit=1", "--js-flags=--max-old-space-size=192"] : []),
    ],
  });
  browser.on("disconnected", () => {
    browserPromise = null;
  });
  return browser;
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launch().catch((e) => {
      browserPromise = null;
      throw e;
    });
  }
  const b = await browserPromise;
  if (!b.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return b;
}

export async function closeBrowser(): Promise<void> {
  const p = browserPromise;
  browserPromise = null;
  if (p) await (await p).close().catch(() => undefined);
}

export interface RenderResult {
  png: Buffer;
  pdf?: Buffer;
  width: number;
  height: number;
  ms: number;
}

export interface RenderOptions {
  /** device scale factor — 2 → 2400×3200 */
  scale?: number;
  pdf?: boolean;
  /** render only the PDF (skip the PNG screenshot) */
  pdfOnly?: boolean;
}

/**
 * Chrome's PDF backend rasterises anything drawn through an SVG filter / blend mode at print DPI. A full-page grain
 * texture therefore balloons a PDF to tens of MB for no visible benefit — vector PDFs skip that one effect.
 */
function forPdf(resolved: ResolvedPoster): ResolvedPoster {
  return { ...resolved, motifs: resolved.motifs.filter((m) => m !== "grain"), backdropUrl: undefined };
}

async function renderOnce(source: ResolvedPoster, opts: RenderOptions): Promise<RenderResult> {
  const t0 = Date.now();
  const scale = opts.scale ?? EXPORT_SCALE;
  const resolved = opts.pdfOnly ? forPdf(source) : source;
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // The document is fully self-contained (fonts + photos inlined). Refuse every network request so nothing
    // user-controlled can make the renderer reach out (SSRF hardening).
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const u = req.url();
      if (u.startsWith("data:") || u.startsWith("about:") || u.startsWith("blob:")) void req.continue();
      else void req.abort("blockedbyclient");
    });
    await page.setViewport({ width: POSTER_WIDTH, height: POSTER_HEIGHT, deviceScaleFactor: scale });
    await page.setContent(renderPosterHtml(resolved), { waitUntil: "load", timeout: 30000 });
    await page.evaluate("document.fonts.ready.then(() => true)");
    // esbuild's keepNames (used by tsx in dev) wraps functions in __name(); shim it before running the fitter.
    await page.evaluate(`window.__name = window.__name || function(t){return t}; (${fitPosterText.toString()})(document)`);
    await page.evaluate("Promise.all(Array.from(document.images).map(function(i){return i.decode ? i.decode().catch(function(){}) : null}))");

    let png: Buffer = Buffer.alloc(0);
    if (!opts.pdfOnly) {
      png = Buffer.from(await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: POSTER_WIDTH, height: POSTER_HEIGHT } }));
    }
    let pdf: Buffer | undefined;
    if (opts.pdf || opts.pdfOnly) {
      pdf = Buffer.from(
        await page.pdf({ width: `${POSTER_WIDTH}px`, height: `${POSTER_HEIGHT}px`, printBackground: true, pageRanges: "1", margin: { top: 0, right: 0, bottom: 0, left: 0 } }),
      );
    }
    return { png, pdf, width: POSTER_WIDTH * scale, height: POSTER_HEIGHT * scale, ms: Date.now() - t0 };
  } finally {
    await page.close().catch(() => undefined);
  }
}

/** Queued render (bounded concurrency) with a hard timeout. One retry if Chrome crashed mid-render. */
export function renderPoster(resolved: ResolvedPoster, opts: RenderOptions = {}): Promise<RenderResult> {
  return queue.add(async () => {
    const attempt = () =>
      Promise.race([
        renderOnce(resolved, opts),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Render timed out")), 90_000)),
      ]);
    try {
      try {
        return await attempt();
      } catch (e) {
        logger.warn({ err: e }, "render failed, retrying once with a fresh browser");
        await closeBrowser();
        return await attempt();
      }
    } finally {
      // give the memory back after every poster, but never close Chrome under another running render
      if (env.lowMemory && queue.pending <= 1) await closeBrowser();
    }
  }) as Promise<RenderResult>;
}
