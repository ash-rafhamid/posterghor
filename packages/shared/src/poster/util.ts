/** Deterministic PRNG (mulberry32) so procedural art is stable between preview and print render. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round to 1 decimal — keeps generated SVG paths compact. */
export const r1 = (n: number): number => Math.round(n * 10) / 10;
export const r2 = (n: number): number => Math.round(n * 100) / 100;

export const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Point on a circle. 0° = 12 o'clock, clockwise. */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = rad(deg - 90);
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** Full ellipse as two arcs — lets us merge thousands of grains into a single <path>. */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number, deg = 0): string {
  const t = rad(deg);
  const dx = rx * Math.cos(t);
  const dy = rx * Math.sin(t);
  const x1 = r1(cx - dx);
  const y1 = r1(cy - dy);
  const x2 = r1(cx + dx);
  const y2 = r1(cy + dy);
  return `M${x1} ${y1}A${r1(rx)} ${r1(ry)} ${r1(deg)} 1 0 ${x2} ${y2}A${r1(rx)} ${r1(ry)} ${r1(deg)} 1 0 ${x1} ${y1}Z`;
}

/** Pointy leaf / feather / petal shape from (0,0) to (len,0), `w` wide at its fullest. */
export function leafPath(len: number, w: number, bulge = 0.42, tip = 0.9): string {
  const l = len;
  return (
    `M0 0C${r1(l * bulge * 0.4)} ${r1(-w)} ${r1(l * bulge * 1.4)} ${r1(-w * 1.05)} ${r1(l * tip)} ${r1(-w * 0.35)}` +
    `Q${r1(l * 0.98)} ${r1(-w * 0.06)} ${r1(l)} 0` +
    `Q${r1(l * 0.98)} ${r1(w * 0.06)} ${r1(l * tip)} ${r1(w * 0.35)}` +
    `C${r1(l * bulge * 1.4)} ${r1(w * 1.05)} ${r1(l * bulge * 0.4)} ${r1(w)} 0 0Z`
  );
}

/** Stable 32-bit hash for strings → used to derive seeds. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}
