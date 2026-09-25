import type { ReactNode } from "react";
import { clamp, ellipsePath, r1, range, rng } from "../util";

/** Crescent moon (mask-cut disc) with a soft glow and gradient fill. */
export function Crescent({
  uid,
  cx,
  cy,
  r,
  from,
  to,
  glow,
  tilt = -18,
}: {
  uid: string;
  cx: number;
  cy: number;
  r: number;
  from: string;
  to: string;
  glow: string;
  tilt?: number;
}): ReactNode {
  return (
    <g transform={`rotate(${tilt} ${cx} ${cy})`}>
      <defs>
        <mask id={`${uid}-cres`}>
          <rect x={cx - r * 2} y={cy - r * 2} width={r * 4} height={r * 4} fill="#fff" />
          <circle cx={cx + r * 0.42} cy={cy - r * 0.05} r={r * 0.86} fill="#000" />
        </mask>
        <linearGradient id={`${uid}-cg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <radialGradient id={`${uid}-cglow`} cx={cx} cy={cy} r={r * 2} gradientUnits="userSpaceOnUse">
          <stop offset="0.3" stopColor={glow} stopOpacity="0.4" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 2} fill={`url(#${uid}-cglow)`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-cg)`} mask={`url(#${uid}-cres)`} />
    </g>
  );
}

/** Five-point star */
export function Star5({ x, y, r, color, rotate = 0, opacity = 1 }: { x: number; y: number; r: number; color: string; rotate?: number; opacity?: number }): ReactNode {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = ((i * 36 - 90 + rotate) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${r1(x + rr * Math.cos(a))} ${r1(y + rr * Math.sin(a))}`);
  }
  return <path d={`M${pts.join("L")}Z`} fill={color} opacity={opacity} />;
}

/** Hanging festival lantern (fanush) on a string. */
export function Lantern({
  uid,
  x,
  top,
  drop,
  w = 96,
  h = 132,
  n = 0,
  body = "#f2a541",
  glow = "#ffd166",
  metal = "#c98a1d",
}: {
  uid: string;
  x: number;
  top: number;
  drop: number;
  w?: number;
  h?: number;
  n?: number;
  body?: string;
  glow?: string;
  metal?: string;
}): ReactNode {
  const gid = `${uid}-ln${n}`;
  const y0 = top + drop;
  const hw = w / 2;
  return (
    <g>
      <defs>
        <radialGradient id={`${gid}-b`} cx="0.5" cy="0.55" r="0.65">
          <stop offset="0" stopColor="#fff3b8" />
          <stop offset="0.5" stopColor={glow} />
          <stop offset="1" stopColor={body} />
        </radialGradient>
        <radialGradient id={`${gid}-g`} cx={x} cy={y0 + h / 2} r={h * 1.1} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={glow} stopOpacity="0.55" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y0 + h / 2} r={h * 1.1} fill={`url(#${gid}-g)`} />
      <path d={`M${x} ${top}V${y0 - 16}`} stroke={metal} strokeWidth="2.5" />
      <circle cx={x} cy={y0 - 20} r="7" fill="none" stroke={metal} strokeWidth="3" />
      <path d={`M${x - hw * 0.5} ${y0}L${x - hw * 0.28} ${y0 - 14}H${x + hw * 0.28}L${x + hw * 0.5} ${y0}Z`} fill={metal} />
      <path
        d={`M${x - hw * 0.5} ${y0}C${x - hw * 1.25} ${y0 + h * 0.3} ${x - hw * 1.2} ${y0 + h * 0.72} ${x - hw * 0.5} ${y0 + h}H${x + hw * 0.5}C${x + hw * 1.2} ${y0 + h * 0.72} ${x + hw * 1.25} ${y0 + h * 0.3} ${x + hw * 0.5} ${y0}Z`}
        fill={`url(#${gid}-b)`}
        stroke={metal}
        strokeWidth="3"
      />
      <path
        d={`M${x} ${y0}V${y0 + h}M${x - hw * 0.5} ${y0}C${x - hw * 0.72} ${y0 + h * 0.35} ${x - hw * 0.72} ${y0 + h * 0.65} ${x - hw * 0.5} ${y0 + h}M${x + hw * 0.5} ${y0}C${x + hw * 0.72} ${y0 + h * 0.35} ${x + hw * 0.72} ${y0 + h * 0.65} ${x + hw * 0.5} ${y0 + h}`}
        fill="none"
        stroke={metal}
        strokeWidth="2.4"
        opacity="0.75"
      />
      <path d={`M${x - hw * 0.5} ${y0 + h}L${x - hw * 0.3} ${y0 + h + 12}H${x + hw * 0.3}L${x + hw * 0.5} ${y0 + h}Z`} fill={metal} />
      <path d={`M${x} ${y0 + h + 12}V${y0 + h + 34}`} stroke={metal} strokeWidth="3" strokeLinecap="round" />
      <circle cx={x} cy={y0 + h + 38} r="5.5" fill={metal} />
    </g>
  );
}

/** Mosque skyline silhouette (domes, minarets, glowing arched windows). */
export function MosqueSkyline({
  uid,
  x,
  y,
  w,
  color,
  window: win,
  seed = 3,
}: {
  uid: string;
  x: number;
  y: number;
  w: number;
  color: string;
  window: string;
  seed?: number;
}): ReactNode {
  const rand = rng(seed);
  const s = w / 1200;
  const dome = (cx: number, base: number, r: number, fin = true) => (
    <g key={`d${cx}`}>
      <path d={`M${r1(cx - r)} ${base}C${r1(cx - r)} ${r1(base - r * 1.05)} ${r1(cx - r * 0.35)} ${r1(base - r * 1.35)} ${r1(cx)} ${r1(base - r * 1.7)}C${r1(cx + r * 0.35)} ${r1(base - r * 1.35)} ${r1(cx + r)} ${r1(base - r * 1.05)} ${r1(cx + r)} ${base}Z`} fill={color} />
      {fin ? <path d={`M${cx} ${r1(base - r * 1.7)}V${r1(base - r * 2.05)}`} stroke={color} strokeWidth={3 * s + 1} /> : null}
    </g>
  );
  const minaret = (cx: number, base: number, h: number, wd: number) => (
    <g key={`m${cx}`}>
      <rect x={r1(cx - wd / 2)} y={r1(base - h)} width={wd} height={h} fill={color} />
      <rect x={r1(cx - wd * 0.85)} y={r1(base - h * 0.78)} width={r1(wd * 1.7)} height={r1(wd * 0.34)} rx="2" fill={color} />
      <rect x={r1(cx - wd * 0.7)} y={r1(base - h * 0.96)} width={r1(wd * 1.4)} height={r1(wd * 0.3)} rx="2" fill={color} />
      <path d={`M${r1(cx - wd * 0.62)} ${r1(base - h * 0.96)}C${r1(cx - wd * 0.62)} ${r1(base - h - wd * 0.9)} ${r1(cx)} ${r1(base - h - wd * 1.2)} ${r1(cx)} ${r1(base - h - wd * 2)}C${r1(cx)} ${r1(base - h - wd * 1.2)} ${r1(cx + wd * 0.62)} ${r1(base - h - wd * 0.9)} ${r1(cx + wd * 0.62)} ${r1(base - h * 0.96)}Z`} fill={color} />
    </g>
  );
  const base = y;
  const cx = x + w / 2;
  const windows = range(9).map((i) => {
    const wx = x + w * (0.3 + i * 0.05) + rand() * 4;
    return (
      <path key={i} d={`M${r1(wx)} ${base + 90 * s}V${base + 52 * s}Q${r1(wx + 9 * s)} ${base + 36 * s} ${r1(wx + 18 * s)} ${base + 52 * s}V${base + 90 * s}Z`} fill={win} opacity={0.5 + rand() * 0.5} />
    );
  });
  return (
    <g>
      {minaret(x + w * 0.09, base + 4, 300 * s, 24 * s)}
      {minaret(x + w * 0.91, base + 4, 300 * s, 24 * s)}
      {minaret(x + w * 0.22, base + 4, 190 * s, 18 * s)}
      {minaret(x + w * 0.78, base + 4, 190 * s, 18 * s)}
      {dome(cx - 250 * s, base, 90 * s)}
      {dome(cx + 250 * s, base, 90 * s)}
      {dome(cx, base, 190 * s)}
      <rect x={x} y={base - 6} width={w} height={400} fill={color} />
      {windows}
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="1" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
    </g>
  );
}

/** A handful of hanging string-lights / bunting is overkill; sparkle confetti keeps festivals lively. */
export function Confetti({
  seed,
  x,
  y,
  w,
  h,
  count,
  colors,
}: {
  seed: number;
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  colors: string[];
}): ReactNode {
  const rand = rng(seed);
  return (
    <g>
      {range(count).map((i) => {
        const px = x + rand() * w;
        const py = y + rand() * h;
        const c = colors[i % colors.length]!;
        const rot = rand() * 360;
        const s = 8 + rand() * 14;
        if (i % 4 === 0) return <circle key={i} cx={r1(px)} cy={r1(py)} r={r1(s * 0.32)} fill={c} opacity={0.85} />;
        return <rect key={i} x={r1(px)} y={r1(py)} width={r1(s)} height={r1(s * 0.34)} rx="2" fill={c} opacity={0.85} transform={`rotate(${r1(rot)} ${r1(px)} ${r1(py)})`} />;
      })}
    </g>
  );
}

/** Ballot-box tick badge for campaigns (graphic only — no text). */
export function VoteBadge({ uid, cx, cy, r, fill, ring, mark }: { uid: string; cx: number; cy: number; r: number; fill: string; ring: string; mark: string }): ReactNode {
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-vb`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={fill} />
          <stop offset="1" stopColor={ring} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r + 12} fill="none" stroke={ring} strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-vb)`} stroke="#ffffff" strokeWidth="6" />
      {/* the ballot paper dropping into the box */}
      <g transform={`rotate(-9 ${cx} ${cy})`}>
        <rect x={cx - r * 0.27} y={cy - r * 0.62} width={r * 0.54} height={r * 0.72} rx="5" fill="#ffffff" stroke={ring} strokeWidth="2" strokeOpacity="0.5" />
        <path d={`M${cx - r * 0.13} ${cy - r * 0.27}L${cx - r * 0.02} ${cy - r * 0.15}L${cx + r * 0.16} ${cy - r * 0.42}`} fill="none" stroke={mark} strokeWidth={clamp(r * 0.1, 5, 12)} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* the box */}
      <rect x={cx - r * 0.56} y={cy + r * 0.04} width={r * 1.12} height={r * 0.52} rx="9" fill="#ffffff" />
      <rect x={cx - r * 0.34} y={cy + r * 0.04} width={r * 0.68} height={r * 0.1} rx="5" fill={ring} />
      <rect x={cx - r * 0.56} y={cy + r * 0.4} width={r * 1.12} height={r * 0.06} fill={ring} opacity="0.18" />
    </g>
  );
}

/** Diagonal band (used behind campaign headlines). Points are absolute; `skew` in px shifts the top edge. */
export function SkewBand({ x, y, w, h, skew = 40, fill, edge }: { x: number; y: number; w: number; h: number; skew?: number; fill: string; edge?: string }): ReactNode {
  const d = `M${x + skew} ${y}H${x + w}L${x + w - skew} ${y + h}H${x}Z`;
  return (
    <g>
      <path d={d} fill={fill} />
      {edge ? <path d={d} fill="none" stroke={edge} strokeWidth="5" strokeLinejoin="round" /> : null}
    </g>
  );
}

/** Ring of little dots (mandala-like) — used as a halo behind circular portraits. */
export function DotRing({ cx, cy, r, count, dot, color, opacity = 0.9 }: { cx: number; cy: number; r: number; count: number; dot: number; color: string; opacity?: number }): ReactNode {
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    d += ellipsePath(cx + r * Math.cos(a), cy + r * Math.sin(a), dot, dot, 0);
  }
  return <path d={d} fill={color} opacity={opacity} />;
}
