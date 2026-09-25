import type { ReactNode } from "react";
import { mix } from "../../color";
import { clamp, ellipsePath, leafPath, lerp, polar, r1, rad, range, rng } from "../util";

/* ────────────────────────────────────────────────────────────────────────────
 * Sun burst — radiating wedges that fade out. One <path>, one gradient.
 * ──────────────────────────────────────────────────────────────────────────── */
export function SunBurst({
  uid,
  cx,
  cy,
  inner = 0,
  outer = 1300,
  count = 44,
  color = "#ffffff",
  opacity = 0.14,
  rotate = 0,
}: {
  uid: string;
  cx: number;
  cy: number;
  inner?: number;
  outer?: number;
  count?: number;
  color?: string;
  opacity?: number;
  rotate?: number;
}): ReactNode {
  const step = 360 / count;
  let d = "";
  for (let i = 0; i < count; i += 2) {
    const a0 = rotate + i * step;
    const a1 = a0 + step;
    const [x0, y0] = polar(cx, cy, inner, a0);
    const [x1, y1] = polar(cx, cy, outer, a0);
    const [x2, y2] = polar(cx, cy, outer, a1);
    const [x3, y3] = polar(cx, cy, inner, a1);
    d += `M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}L${r1(x3)} ${r1(y3)}Z`;
  }
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-burst`} cx={cx} cy={cy} r={outer} gradientUnits="userSpaceOnUse">
          <stop offset={clamp(inner / outer, 0, 0.9)} stopColor={color} stopOpacity={opacity * 1.6} />
          <stop offset="0.75" stopColor={color} stopOpacity={opacity * 0.6} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={d} fill={`url(#${uid}-burst)`} />
    </g>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Sun disc — flag-red sun with a soft halo and thin rings
 * ──────────────────────────────────────────────────────────────────────────── */
export function SunDisc({
  uid,
  cx,
  cy,
  r,
  from,
  to,
  ring,
  halo,
}: {
  uid: string;
  cx: number;
  cy: number;
  r: number;
  from: string;
  to: string;
  ring: string;
  halo: string;
}): ReactNode {
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-sun`} cx="0.42" cy="0.36" r="0.85">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </radialGradient>
        <radialGradient id={`${uid}-halo`} cx={cx} cy={cy} r={r * 1.7} gradientUnits="userSpaceOnUse">
          <stop offset="0.55" stopColor={halo} stopOpacity="0.55" />
          <stop offset="1" stopColor={halo} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.7} fill={`url(#${uid}-halo)`} />
      <circle cx={cx} cy={cy} r={r + 26} fill="none" stroke={ring} strokeOpacity="0.55" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r + 52} fill="none" stroke={ring} strokeOpacity="0.28" strokeWidth="2" strokeDasharray="3 13" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-sun)`} />
    </g>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Paddy field — golden rice stalks (ধানের শীষ), procedurally grown in depth rows.
 * Each row is three <path>s (leaves / stems / grains), so hundreds of stalks stay cheap.
 * ──────────────────────────────────────────────────────────────────────────── */
export interface PaddyRow {
  count: number;
  /** stalk height (px) */
  height: number;
  /** y of the ground line for this row */
  baseY: number;
  /** 0..1 blend towards `fade` (atmospheric depth) */
  depth: number;
  scale: number;
  /** stalks near the left/right edges grow this much taller (0 = flat field) */
  edgeBoost?: number;
}

export function PaddyField({
  seed,
  width = 1200,
  rows,
  ear,
  earHi,
  stem,
  leaf,
  fade,
  wind = 0.05,
}: {
  seed: number;
  width?: number;
  rows: PaddyRow[];
  ear: string;
  earHi: string;
  stem: string;
  leaf: string;
  fade: string;
  wind?: number;
}): ReactNode {
  const rand = rng(seed);
  return (
    <g>
      {rows.map((row, ri) => {
        const cEar = mix(ear, fade, row.depth);
        const cHi = mix(earHi, fade, row.depth);
        const cStem = mix(stem, fade, row.depth);
        const cLeaf = mix(leaf, fade, row.depth);
        let stems = "";
        let leaves = "";
        let grains = "";
        let grainsHi = "";
        const spacing = (width + 120) / row.count;
        for (let i = 0; i < row.count; i++) {
          const x = -60 + i * spacing + (rand() - 0.5) * spacing * 0.9;
          const edge = Math.pow(Math.min(1, Math.abs(x - width / 2) / (width / 2)), 2.2);
          const h = row.height * (0.78 + rand() * 0.34) * (1 + (row.edgeBoost ?? 0) * edge);
          const lean = wind * Math.sin(x * 0.0055 + ri * 1.7) + (rand() - 0.5) * 0.11 + 0.02;
          const base = row.baseY + rand() * 10;
          const tx = x + lean * h;
          const ty = base - h;
          const dir = lean >= 0 ? 1 : -1;
          // stem
          stems += `M${r1(x)} ${r1(base)}C${r1(x + lean * h * 0.1)} ${r1(base - h * 0.5)} ${r1(tx - lean * h * 0.25)} ${r1(base - h * 0.86)} ${r1(tx)} ${r1(ty)}`;
          // ear: quadratic droop from the tip
          const earLen = h * 0.3 * row.scale + 40;
          const ex = tx + dir * earLen * 0.5;
          const ey = ty + earLen * 0.62;
          const cx = tx + dir * earLen * 0.2;
          const cy = ty - earLen * 0.2;
          stems += `M${r1(tx)} ${r1(ty)}Q${r1(cx)} ${r1(cy)} ${r1(ex)} ${r1(ey)}`;
          const n = 8 + Math.floor(rand() * 4);
          for (let g = 0; g < n; g++) {
            const t = 0.1 + (g / n) * 0.9;
            const it = 1 - t;
            const px = it * it * tx + 2 * it * t * cx + t * t * ex;
            const py = it * it * ty + 2 * it * t * cy + t * t * ey;
            // tangent
            const dx = 2 * it * (cx - tx) + 2 * t * (ex - cx);
            const dy = 2 * it * (cy - ty) + 2 * t * (ey - cy);
            const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
            const side = g % 2 === 0 ? 1 : -1;
            const nx = -dy / Math.hypot(dx, dy);
            const ny = dx / Math.hypot(dx, dy);
            const off = 5.2 * row.scale * side;
            const rx = (10 + rand() * 2.5) * row.scale;
            const ry = (4.4 + rand() * 0.8) * row.scale;
            const d = ellipsePath(px + nx * off, py + ny * off, rx, ry, ang + side * 26);
            if (g % 3 === 0) grainsHi += d;
            else grains += d;
          }
          // leaves
          for (let l = 0; l < 2; l++) {
            const lt = 0.25 + l * 0.22 + rand() * 0.08;
            const lx = lerp(x, tx, lt);
            const ly = base - h * lt;
            const side = l === 0 ? -1 : 1;
            const len = h * (0.36 + rand() * 0.16);
            const tipX = lx + side * len * 0.9;
            const tipY = ly - len * 0.35 + len * 0.55 * (rand() > 0.55 ? 1 : 0.2);
            const c1x = lx + side * len * 0.35;
            const c1y = ly - len * 0.62;
            const wid = 5.5 * row.scale;
            leaves += `M${r1(lx)} ${r1(ly)}Q${r1(c1x)} ${r1(c1y - wid)} ${r1(tipX)} ${r1(tipY)}Q${r1(c1x + side * wid)} ${r1(c1y + wid * 1.4)} ${r1(lx)} ${r1(ly)}Z`;
          }
        }
        return (
          <g key={ri}>
            <path d={leaves} fill={cLeaf} />
            <path d={stems} fill="none" stroke={cStem} strokeWidth={3.2 * row.scale} strokeLinecap="round" />
            <path d={grains} fill={cEar} />
            <path d={grainsHi} fill={cHi} />
          </g>
        );
      })}
    </g>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Dove — a stylised flying dove built from feather "leaves" fanned around the shoulder.
 * Local coordinate box is roughly x∈[-70,265], y∈[-75,165]; flying right.
 * ──────────────────────────────────────────────────────────────────────────── */
const NEAR_WING: Array<[number, number, number]> = [
  // [angle°, length, width]
  [-168, 104, 24],
  [-154, 128, 27],
  [-140, 150, 29],
  [-126, 166, 30],
  [-113, 172, 30],
  [-101, 158, 27],
  [-90, 132, 23],
];

export function Dove({
  x,
  y,
  scale = 1,
  rotate = 0,
  flip = false,
  fill = "#ffffff",
  shade = "#dfe8e3",
  line = "rgba(10,40,30,0.16)",
  glow,
  wing = 0,
}: {
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
  flip?: boolean;
  fill?: string;
  shade?: string;
  line?: string;
  glow?: string;
  /** wing pose: -1 (down) … 0 … 1 (high) */
  wing?: number;
}): ReactNode {
  const tilt = wing * 10;
  const pivotNear = { x: 132, y: 112 };
  const pivotFar = { x: 122, y: 104 };
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(rotate)}) scale(${flip ? -scale : scale} ${scale})`}>
      {glow ? <ellipse cx="110" cy="60" rx="190" ry="120" fill={glow} opacity="0.16" /> : null}
      {/* far wing */}
      <g transform={`translate(${pivotFar.x} ${pivotFar.y}) rotate(${r1(14 + tilt * 0.6)})`} fill={shade} stroke={line} strokeWidth="1.6">
        {NEAR_WING.map(([a, l, w], i) => (
          <path key={i} d={leafPath(l * 0.86, w * 0.9, 0.4, 0.92)} transform={`rotate(${a})`} />
        ))}
      </g>
      {/* tail */}
      <g transform="translate(40 128)" fill={fill} stroke={line} strokeWidth="1.6">
        <path d={leafPath(96, 15, 0.45, 0.9)} transform="rotate(196)" />
        <path d={leafPath(108, 16, 0.45, 0.9)} transform="rotate(180)" />
        <path d={leafPath(92, 15, 0.45, 0.9)} transform="rotate(166)" />
      </g>
      {/* body + head + beak */}
      <path
        d="M30 130C62 116 98 106 138 106C164 105 180 95 192 81C200 71 212 65 226 67C238 69 244 77 242 85L266 96L242 98C236 116 216 134 186 146C142 164 84 158 30 130Z"
        fill={fill}
        stroke={line}
        strokeWidth="1.6"
      />
      <path d="M150 128C170 128 196 118 212 104" fill="none" stroke={line} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="226" cy="81" r="3.6" fill="#1b2a24" />
      {/* near wing */}
      <g transform={`translate(${pivotNear.x} ${pivotNear.y}) rotate(${r1(tilt)})`} fill={fill} stroke={line} strokeWidth="1.6">
        {NEAR_WING.map(([a, l, w], i) => (
          <path key={i} d={leafPath(l, w, 0.4, 0.92)} transform={`rotate(${a})`} />
        ))}
        <ellipse cx="6" cy="2" rx="46" ry="26" transform="rotate(-30)" />
      </g>
    </g>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Bangladesh flag — green field, red disc (offset toward the hoist), gently waving.
 * The wave is applied to real geometry (outline + disc) with shaded strips on top.
 * ──────────────────────────────────────────────────────────────────────────── */
export function BdFlag({
  x,
  y,
  w,
  rotate = 0,
  amp = 0.05,
  waves = 1.25,
  phase = 0,
  poleLen,
  green = "#006a4e",
  red = "#f42a41",
  pole = "#e9d9a8",
}: {
  x: number;
  y: number;
  w: number;
  rotate?: number;
  amp?: number;
  waves?: number;
  phase?: number;
  poleLen?: number;
  green?: string;
  red?: string;
  pole?: string;
}): ReactNode {
  const h = w * 0.6;
  const N = 36;
  const warp = (u: number, v: number): [number, number] => {
    const damp = 0.12 + 0.88 * u;
    const dy = Math.sin(u * waves * Math.PI * 2 + phase) * amp * w * damp;
    const sag = u * u * h * 0.05;
    return [u * w, v * h + dy + sag * (v - 0.5)];
  };
  const P = (pt: [number, number]) => `${r1(pt[0])} ${r1(pt[1])}`;
  const outline: string[] = [];
  for (let i = 0; i <= N; i++) outline.push(P(warp(i / N, 0)));
  for (let i = N; i >= 0; i--) outline.push(P(warp(i / N, 1)));
  const disc: string[] = [];
  const cu = 0.45;
  const cr = w * 0.1;
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    disc.push(P(warp(cu + (cr * Math.cos(t)) / w, 0.5 + (cr * Math.sin(t)) / h)));
  }
  const shades = range(N).map((i) => {
    const u0 = i / N;
    const u1 = (i + 1) / N;
    const mid = (u0 + u1) / 2;
    const slope = Math.cos(mid * waves * Math.PI * 2 + phase);
    const a = Math.abs(slope) * 0.26;
    const pts = [warp(u0, 0), warp(u1, 0), warp(u1, 1), warp(u0, 1)].map(P).join("L");
    return <path key={i} d={`M${pts}Z`} fill={slope > 0 ? `rgba(255,255,255,${r1(a * 0.55)})` : `rgba(0,0,0,${r1(a)})`} />;
  });
  const pl = poleLen ?? w * 2.1;
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(rotate)})`}>
      <rect x={-5} y={-12} width={10} height={pl} rx={5} fill={pole} />
      <circle cx={0} cy={-14} r={9} fill={pole} />
      <path d={`M${outline.join("L")}Z`} fill={green} />
      <path d={`M${disc.join("L")}Z`} fill={red} />
      <g>{shades}</g>
    </g>
  );
}
