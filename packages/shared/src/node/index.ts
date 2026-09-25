import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PosterCanvas } from "../poster/engine";
import type { ResolvedPoster } from "../poster/types";
import type { FontDef } from "../fonts";

/**
 * Node-only helpers (server-side rendering of a poster to a self-contained HTML document).
 * Kept out of the isomorphic entry point so the Next.js bundle never pulls in `fs`.
 */

const require = createRequire(import.meta.url);
const fontCache = new Map<string, string>();

/** Reads a font file from its @fontsource package and returns a base64 `data:` URI. */
export function fontDataUri(file: string, def: FontDef): string {
  const key = `${def.pkg}/${file}`;
  let uri = fontCache.get(key);
  if (!uri) {
    const pkgJson = require.resolve(`${def.pkg}/package.json`);
    const abs = path.join(path.dirname(pkgJson), "files", file);
    uri = `data:font/woff2;base64,${fs.readFileSync(abs).toString("base64")}`;
    fontCache.set(key, uri);
  }
  return uri;
}

/** Full HTML document for one poster — fonts and images inlined, no network needed. */
export function renderPosterHtml(resolved: ResolvedPoster, opts: { uid?: string; placeholders?: boolean } = {}): string {
  const markup = renderToStaticMarkup(
    createElement(PosterCanvas, {
      resolved,
      fontUrl: fontDataUri,
      uid: opts.uid ?? "pp",
      placeholders: opts.placeholders ?? false,
    }),
  );
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>Poster</title>
<style>@page{size:1200px 1600px;margin:0}html,body{margin:0;padding:0;background:#ffffff}body{width:1200px;height:1600px;overflow:hidden}</style>
</head><body>${markup}</body></html>`;
}
