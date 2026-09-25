import type { ReactNode } from "react";
import { leafPath, r1, range, rng } from "../util";

/* ────────────────────────────────────────────────────────────────────────────
 * Shapla — the national flower (water lily). Side view: fanned petals over a lily pad.
 * Local origin (0,0) is the base of the flower; petals grow upward (−y).
 * ──────────────────────────────────────────────────────────────────────────── */
export function Shapla({
  uid,
  x,
  y,
  size = 1,
  rotate = 0,
  petal = "#ffffff",
  tip = "#f6c9d6",
  pad = "#2f6b4a",
  padLight = "#4b9168",
  showPad = true,
  centre = "#f6c445",
  n = 0,
}: {
  uid: string;
  x: number;
  y: number;
  size?: number;
  rotate?: number;
  petal?: string;
  tip?: string;
  pad?: string;
  padLight?: string;
  showPad?: boolean;
  centre?: string;
  /** unique suffix so several lilies can share gradients on one poster */
  n?: number;
}): ReactNode {
  const gid = `${uid}-sh${n}`;
  const back = [-72, -50, -28, -8, 12, 34, 56, 74];
  const front = [-58, -34, -12, 10, 32, 58];
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(rotate)}) scale(${size})`}>
      <defs>
        <linearGradient id={`${gid}-p`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={petal} />
          <stop offset="0.6" stopColor={petal} />
          <stop offset="1" stopColor={tip} />
        </linearGradient>
        <linearGradient id={`${gid}-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={petal} stopOpacity="0.85" />
          <stop offset="1" stopColor={tip} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {showPad ? (
        <g>
          <ellipse cx="0" cy="22" rx="190" ry="34" fill={pad} />
          <ellipse cx="0" cy="18" rx="182" ry="28" fill={padLight} opacity="0.55" />
          <path d="M0 22L118 4" stroke={pad} strokeWidth="5" />
        </g>
      ) : null}
      {/* sepals */}
      <g fill="#3d8a5c">
        <path d={leafPath(60, 12)} transform="rotate(150)" />
        <path d={leafPath(60, 12)} transform="rotate(30)" />
        <path d={leafPath(54, 11)} transform="rotate(90)" />
      </g>
      {/* back petals */}
      <g fill={`url(#${gid}-b)`} stroke="rgba(120,60,90,0.18)" strokeWidth="1.2">
        {back.map((a, i) => (
          <path key={i} d={leafPath(150 - Math.abs(a) * 0.35, 30, 0.46, 0.94)} transform={`rotate(${a - 90})`} />
        ))}
      </g>
      {/* front petals */}
      <g fill={`url(#${gid}-p)`} stroke="rgba(120,60,90,0.22)" strokeWidth="1.3">
        {front.map((a, i) => (
          <path key={i} d={leafPath(120 - Math.abs(a) * 0.3, 27, 0.46, 0.94)} transform={`rotate(${a - 90})`} />
        ))}
      </g>
      <circle cx="0" cy="-8" r="14" fill={centre} />
      <g fill={centre}>
        {range(7).map((i) => (
          <circle key={i} cx={-18 + i * 6} cy={-14 - Math.abs(3 - i) * -2} r="3" />
        ))}
      </g>
    </g>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Candle with a glowing flame
 * ──────────────────────────────────────────────────────────────────────────── */
export function Candle({
  uid,
  x,
  y,
  h = 200,
  w = 46,
  n = 0,
  wax = "#f4ead2",
  flame = "#ffd166",
}: {
  uid: string;
  x: number;
  y: number;
  h?: number;
  w?: number;
  n?: number;
  wax?: string;
  flame?: string;
}): ReactNode {
  const gid = `${uid}-cd${n}`;
  const fy = y - h;
  return (
    <g>
      <defs>
        <linearGradient id={`${gid}-w`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d8c9a4" />
          <stop offset="0.35" stopColor={wax} />
          <stop offset="1" stopColor="#c9b98f" />
        </linearGradient>
        <radialGradient id={`${gid}-g`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={flame} stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#ff9f1c" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ff9f1c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${gid}-f`} cx="0.5" cy="0.72" r="0.62">
          <stop offset="0" stopColor="#fff8d6" />
          <stop offset="0.45" stopColor={flame} />
          <stop offset="1" stopColor="#f77f00" />
        </radialGradient>
      </defs>
      <circle cx={x} cy={fy - 30} r={h * 0.95} fill={`url(#${gid}-g)`} />
      <path
        d={`M${x - w / 2} ${y}V${fy + 10}Q${x - w / 2} ${fy} ${x - w / 2 + 8} ${fy}H${x + w / 2 - 8}Q${x + w / 2} ${fy} ${x + w / 2} ${fy + 10}V${y}Q${x} ${y + 12} ${x - w / 2} ${y}Z`}
        fill={`url(#${gid}-w)`}
      />
      <path d={`M${x - w / 2 + 3} ${fy + 2}Q${x - w * 0.15} ${fy + 26} ${x - w * 0.12} ${fy + 44}Q${x - w * 0.1} ${fy + 54} ${x + w * 0.06} ${fy + 36}Q${x + w * 0.16} ${fy + 20} ${x + w / 2 - 3} ${fy + 2}Z`} fill="#fffaf0" opacity="0.7" />
      <path d={`M${x} ${fy}V${fy - 12}`} stroke="#3a2a1a" strokeWidth="3.5" strokeLinecap="round" />
      <path d={`M${x} ${fy - 14}C${x - 22} ${fy - 38} ${x - 14} ${fy - 62} ${x} ${fy - 86}C${x + 14} ${fy - 62} ${x + 22} ${fy - 38} ${x} ${fy - 14}Z`} fill={`url(#${gid}-f)`} />
    </g>
  );
}

/** Black mourning sash across the top-left corner, with a folded end. */
export function MourningSash({ size = 300, color = "#0a0a0c", edge = "#d9d2c1" }: { size?: number; color?: string; edge?: string }): ReactNode {
  const s = size;
  const b = s * 0.26;
  return (
    <g>
      <path d={`M0 ${s}L${s} 0H${s + b}L0 ${s + b}Z`} fill={color} />
      <path d={`M0 ${s - 6}L${s - 6} 0M0 ${s + b + 6}L${s + b + 6} 0`} stroke={edge} strokeOpacity="0.35" strokeWidth="2" />
    </g>
  );
}

/** Soft rays of light falling from the top — a gentle "heavenly light" effect. */
export function LightBeams({ uid, W, H, color = "#ffffff", opacity = 0.12, x = 600 }: { uid: string; W: number; H: number; color?: string; opacity?: number; x?: number }): ReactNode {
  const rays: Array<[number, number]> = [
    [-520, -330],
    [-330, -170],
    [-150, 20],
    [40, 190],
    [230, 380],
    [430, 610],
  ];
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={opacity * 1.7} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {rays.map(([a, b], i) => (
        <path key={i} d={`M${x + a * 0.16} 0L${x + b * 0.16} 0L${x + b * 1.5} ${H * 0.9}L${x + a * 1.5} ${H * 0.9}Z`} fill={`url(#${uid}-beam)`} opacity={0.5 + (i % 3) * 0.2} />
      ))}
    </g>
  );
}

/** Falling petals / embers drifting upward (tribute atmosphere). */
export function Drift({ seed, x, y, w, h, count, color, maxR = 5 }: { seed: number; x: number; y: number; w: number; h: number; count: number; color: string; maxR?: number }): ReactNode {
  const rand = rng(seed);
  return (
    <g fill={color}>
      {range(count).map((i) => (
        <circle key={i} cx={r1(x + rand() * w)} cy={r1(y + rand() * h)} r={r1(1.2 + rand() * maxR)} opacity={0.2 + rand() * 0.6} />
      ))}
    </g>
  );
}
