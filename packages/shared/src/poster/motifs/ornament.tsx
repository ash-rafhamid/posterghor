import type { ReactNode } from "react";
import { ellipsePath, r1, range, rng } from "../util";

/** Fine paper / print grain. `soft-light` adds texture without darkening the design. */
export function Grain({
  uid,
  W,
  H,
  opacity = 0.32,
  blend = "soft-light",
}: {
  uid: string;
  W: number;
  H: number;
  opacity?: number;
  blend?: string;
}): ReactNode {
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ mixBlendMode: blend as never, opacity }}>
      <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter={`url(#${uid}-grain)`} />
    </svg>
  );
}

/** Vignette — darkens the corners a touch so the centre pops. */
export function Vignette({ uid, W, H, color = "#000000", strength = 0.35 }: { uid: string; W: number; H: number; color?: string; strength?: number }): ReactNode {
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <radialGradient id={`${uid}-vig`} cx="50%" cy="46%" r="75%">
          <stop offset="0.55" stopColor={color} stopOpacity="0" />
          <stop offset="1" stopColor={color} stopOpacity={strength} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-vig)`} />
    </svg>
  );
}

/** Folded ribbon banner. The text sits on top of the centre band (placed by the engine). */
export function RibbonBanner({
  x,
  y,
  w,
  h,
  fold = 54,
  fill,
  dark,
  edge,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fold?: number;
  fill: string;
  dark: string;
  edge?: string;
}): ReactNode {
  const off = Math.round(h * 0.26);
  const yb = y + h;
  const notch = Math.round(h * 0.34);
  const left = `M${x} ${y + off}H${x + fold + 10}V${yb + off}H${x}L${x + notch} ${y + off + h / 2}Z`;
  const right = `M${x + w} ${y + off}H${x + w - fold - 10}V${yb + off}H${x + w}L${x + w - notch} ${y + off + h / 2}Z`;
  const foldL = `M${x + fold} ${yb}L${x + fold} ${yb + off}L${x + fold + off * 1.1} ${yb}Z`;
  const foldR = `M${x + w - fold} ${yb}L${x + w - fold} ${yb + off}L${x + w - fold - off * 1.1} ${yb}Z`;
  return (
    <g>
      <path d={left} fill={dark} />
      <path d={right} fill={dark} />
      <path d={foldL} fill="rgba(0,0,0,0.38)" />
      <path d={foldR} fill="rgba(0,0,0,0.38)" />
      <path d={`M${x + fold} ${y}H${x + w - fold}V${yb}H${x + fold}Z`} fill={fill} />
      {edge ? (
        <path
          d={`M${x + fold} ${y + 7}H${x + w - fold}M${x + fold} ${yb - 7}H${x + w - fold}`}
          stroke={edge}
          strokeOpacity="0.7"
          strokeWidth="2"
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
}

/** Double hairline frame with notched corners and diamond studs. */
export function InsetFrame({
  W,
  H,
  inset = 22,
  color,
  width = 2.5,
  opacity = 0.9,
}: {
  W: number;
  H: number;
  inset?: number;
  color: string;
  width?: number;
  opacity?: number;
}): ReactNode {
  const a = inset;
  const b = inset + 11;
  const c = 34; // corner notch
  const outer = `M${a + c} ${a}H${W - a - c}L${W - a} ${a + c}V${H - a - c}L${W - a - c} ${H - a}H${a + c}L${a} ${H - a - c}V${a + c}Z`;
  const inner = `M${b + c} ${b}H${W - b - c}L${W - b} ${b + c}V${H - b - c}L${W - b - c} ${H - b}H${b + c}L${b} ${H - b - c}V${b + c}Z`;
  const studs: Array<[number, number]> = [
    [a + c / 2 + 2, a + c / 2 + 2],
    [W - a - c / 2 - 2, a + c / 2 + 2],
    [a + c / 2 + 2, H - a - c / 2 - 2],
    [W - a - c / 2 - 2, H - a - c / 2 - 2],
  ];
  return (
    <g opacity={opacity}>
      <path d={outer} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" />
      <path d={inner} fill="none" stroke={color} strokeWidth={width * 0.5} strokeLinejoin="round" strokeOpacity="0.8" />
      {studs.map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 7}L${x + 7} ${y}L${x} ${y + 7}L${x - 7} ${y}Z`} fill={color} />
      ))}
    </g>
  );
}

/** Halftone dot field that fades along a direction. */
export function Halftone({
  x,
  y,
  w,
  h,
  color,
  opacity = 0.35,
  spacing = 26,
  maxR = 10,
  direction = "down",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  opacity?: number;
  spacing?: number;
  maxR?: number;
  direction?: "down" | "up" | "left" | "right" | "radial";
}): ReactNode {
  const cols = Math.ceil(w / spacing);
  const rows = Math.ceil(h / spacing);
  const levels = 6;
  // levels 1…6 (a dot of full size sits at `levels`), so index 0 is unused
  const buckets: string[] = range(levels + 1).map(() => "");
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = i / Math.max(1, cols - 1);
      const v = j / Math.max(1, rows - 1);
      let t: number;
      switch (direction) {
        case "up":
          t = v;
          break;
        case "left":
          t = u;
          break;
        case "right":
          t = 1 - u;
          break;
        case "radial":
          t = 1 - Math.min(1, Math.hypot(u - 0.5, v - 0.5) * 1.6);
          break;
        default:
          t = 1 - v;
      }
      const lvl = Math.floor(t * levels);
      if (lvl <= 0) continue;
      const rr = (maxR * lvl) / levels;
      const cx = x + i * spacing + ((j % 2) * spacing) / 2;
      const cy = y + j * spacing;
      buckets[lvl] += ellipsePath(cx, cy, rr, rr, 0);
    }
  }
  return (
    <g fill={color} opacity={opacity}>
      {buckets.map((d, i) => (d ? <path key={i} d={d} /> : null))}
    </g>
  );
}

/** Concave four-point sparkle */
export function Sparkle({ x, y, s, color, opacity = 1 }: { x: number; y: number; s: number; color: string; opacity?: number }): ReactNode {
  const k = s * 0.16;
  return (
    <path
      d={`M${r1(x)} ${r1(y - s)}Q${r1(x + k)} ${r1(y - k)} ${r1(x + s)} ${r1(y)}Q${r1(x + k)} ${r1(y + k)} ${r1(x)} ${r1(y + s)}Q${r1(x - k)} ${r1(y + k)} ${r1(x - s)} ${r1(y)}Q${r1(x - k)} ${r1(y - k)} ${r1(x)} ${r1(y - s)}Z`}
      fill={color}
      opacity={opacity}
    />
  );
}

/** Scatter of sparkles / dots inside a rectangle. */
export function Starfield({
  seed,
  x,
  y,
  w,
  h,
  count,
  color,
  minS = 5,
  maxS = 16,
}: {
  seed: number;
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  color: string;
  minS?: number;
  maxS?: number;
}): ReactNode {
  const rand = rng(seed);
  return (
    <g>
      {range(count).map((i) => {
        const s = minS + rand() * (maxS - minS);
        const px = x + rand() * w;
        const py = y + rand() * h;
        return i % 3 === 0 ? (
          <circle key={i} cx={r1(px)} cy={r1(py)} r={r1(s * 0.22)} fill={color} opacity={0.5 + rand() * 0.5} />
        ) : (
          <Sparkle key={i} x={px} y={py} s={s} color={color} opacity={0.45 + rand() * 0.55} />
        );
      })}
    </g>
  );
}

/** Thin ornamental divider: —— ◆ —— */
export function DiamondRule({ cx, y, w, color, opacity = 0.9 }: { cx: number; y: number; w: number; color: string; opacity?: number }): ReactNode {
  const half = w / 2;
  return (
    <g opacity={opacity} stroke={color} fill={color}>
      <path d={`M${cx - half} ${y}H${cx - 18}M${cx + 18} ${y}H${cx + half}`} strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M${cx} ${y - 8}L${cx + 8} ${y}L${cx} ${y + 8}L${cx - 8} ${y}Z`} stroke="none" />
      <circle cx={cx - half - 9} cy={y} r="3" stroke="none" />
      <circle cx={cx + half + 9} cy={y} r="3" stroke="none" />
    </g>
  );
}
