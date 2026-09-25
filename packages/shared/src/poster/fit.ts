/**
 * Text fitting.
 *
 * Every text element that must stay inside a box is marked `data-fit` with `data-max` / `data-min` font sizes.
 * `fitPosterText` binary-searches the largest font size that keeps the text inside its slot. It only uses layout
 * metrics (offsetHeight / scrollWidth), so it is unaffected by the CSS transform the studio uses to scale the
 * preview — the browser preview and the headless-Chrome print render fit identically.
 *
 * Must be called after web fonts have loaded (`document.fonts.ready`).
 */
export function fitPosterText(root: ParentNode = document): void {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-fit]"));
  for (const el of nodes) {
    // hidden (display:none) previews have no layout — measuring would collapse the text to its minimum size
    if (el.clientWidth === 0) continue;
    const max = Number(el.dataset.max) || 40;
    const min = Math.min(Number(el.dataset.min) || 12, max);
    const scale = Number(el.dataset.scale) || 1;
    const boxH = Number(el.dataset.h) || 0; // 0 = don't constrain height
    const start = Math.max(min, max * scale);

    const fits = () => el.scrollWidth <= el.clientWidth + 1 && (boxH <= 0 || el.offsetHeight <= boxH + 1);

    el.style.fontSize = `${start}px`;
    if (!fits()) {
      let lo = min;
      let hi = start;
      for (let i = 0; i < 10 && hi - lo > 0.4; i++) {
        const mid = (lo + hi) / 2;
        el.style.fontSize = `${mid}px`;
        if (fits()) lo = mid;
        else hi = mid;
      }
      el.style.fontSize = `${lo}px`;
    }
  }
  const scope = root instanceof Element ? root : (root as Document).documentElement;
  scope?.setAttribute("data-fit-done", "1");
}

/** Resolves once web fonts are ready (or after `timeoutMs`, so a broken font can't hang the UI). */
export async function fontsReady(doc: Document = document, timeoutMs = 4000): Promise<void> {
  const fonts = (doc as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  if (!fonts) return;
  await Promise.race([fonts.ready, new Promise((r) => setTimeout(r, timeoutMs))]);
}
