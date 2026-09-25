import type { ReactNode } from "react";
import { ellipsePath, leafPath, lerp, r1, range, rng } from "../util";

/**
 * Alpona — Bengali floor-painting rosette. Concentric rings, a wreath of petals and a dotted crown.
 * Drawn as strokes so it works in one colour (white on red, red on cream …).
 */
export function AlponaRosette({
  cx,
  cy,
  r,
  color,
  petals = 12,
  weight = 3,
  fill = 0.22,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  petals?: number;
  weight?: number;
  fill?: number;
}): ReactNode {
  const step = 360 / petals;
  return (
    <g fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.9} strokeOpacity="0.55" strokeWidth={weight * 0.55} />
      {range(petals).map((i) => (
        <path
          key={i}
          d={leafPath(r * 0.66, r * 0.13, 0.5, 0.94)}
          transform={`translate(${r1(cx)} ${r1(cy)}) rotate(${r1(i * step)}) translate(${r1(r * 0.24)} 0)`}
          fill={color}
          fillOpacity={i % 2 === 0 ? fill : 0}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.22} />
      <circle cx={cx} cy={cy} r={r * 0.1} fill={color} stroke="none" />
      {range(petals).map((i) => {
        const a = ((i + 0.5) * step * Math.PI) / 180;
        return <circle key={`d${i}`} cx={r1(cx + Math.cos(a) * r * 0.96)} cy={r1(cy + Math.sin(a) * r * 0.96)} r={weight * 0.75} fill={color} stroke="none" />;
      })}
    </g>
  );
}

/** Horizontal alpona band: rosettes joined by scalloped garlands. */
export function AlponaBand({
  x,
  y,
  w,
  color,
  r = 46,
  gap = 118,
  weight = 3,
  flip = false,
}: {
  x: number;
  y: number;
  w: number;
  color: string;
  r?: number;
  gap?: number;
  weight?: number;
  flip?: boolean;
}): ReactNode {
  const n = Math.floor(w / gap);
  const start = x + (w - (n - 1) * gap) / 2;
  const dir = flip ? -1 : 1;
  return (
    <g>
      <path d={`M${x} ${y - dir * (r + 14)}H${x + w}M${x} ${y + dir * (r + 14)}H${x + w}`} stroke={color} strokeWidth={weight} strokeOpacity="0.85" />
      <path d={`M${x} ${y - dir * (r + 22)}H${x + w}`} stroke={color} strokeWidth={weight * 0.5} strokeOpacity="0.5" strokeDasharray="2 9" strokeLinecap="round" />
      {range(n).map((i) => {
        const cx = start + i * gap;
        return <AlponaRosette key={i} cx={cx} cy={y} r={r} color={color} petals={10} weight={weight} />;
      })}
      {range(n - 1).map((i) => {
        const x0 = start + i * gap + r + 4;
        const x1 = start + (i + 1) * gap - r - 4;
        return (
          <g key={`g${i}`} fill="none" stroke={color} strokeWidth={weight * 0.9} strokeLinecap="round">
            <path d={`M${r1(x0)} ${y}Q${r1((x0 + x1) / 2)} ${y - dir * 22} ${r1(x1)} ${y}`} />
            <path d={`M${r1(x0)} ${y}Q${r1((x0 + x1) / 2)} ${y + dir * 22} ${r1(x1)} ${y}`} />
          </g>
        );
      })}
    </g>
  );
}

/** Marigold (genda phul) — three rings of overlapping petals. */
export function Marigold({ cx, cy, r, outer, mid, inner, centre }: { cx: number; cy: number; r: number; outer: string; mid: string; inner: string; centre: string }): ReactNode {
  const ring = (n: number, rad: number, rx: number, ry: number, off: number) => {
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * 360;
      const t = (a * Math.PI) / 180;
      d += ellipsePath(cx + Math.cos(t) * rad, cy + Math.sin(t) * rad, rx, ry, a);
    }
    return d;
  };
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 1.02} fill={outer} opacity="0.25" />
      <path d={ring(16, r * 0.7, r * 0.32, r * 0.17, 0)} fill={outer} />
      <path d={ring(13, r * 0.5, r * 0.26, r * 0.15, 11)} fill={mid} />
      <path d={ring(9, r * 0.28, r * 0.2, r * 0.13, 25)} fill={inner} />
      <circle cx={cx} cy={cy} r={r * 0.1} fill={centre} />
    </g>
  );
}

/** Coconut / palm tree silhouette. */
export function PalmTree({
  x,
  y,
  h,
  lean = 0.12,
  color,
  fronds = 8,
  seed = 1,
}: {
  x: number;
  y: number;
  h: number;
  lean?: number;
  color: string;
  fronds?: number;
  seed?: number;
}): ReactNode {
  const rand = rng(seed);
  const tx = x + lean * h;
  const ty = y - h;
  const w0 = h * 0.045;
  const w1 = h * 0.022;
  const trunk = `M${r1(x - w0)} ${y}Q${r1(x + lean * h * 0.15)} ${r1(y - h * 0.55)} ${r1(tx - w1)} ${r1(ty)}L${r1(tx + w1)} ${r1(ty)}Q${r1(x + lean * h * 0.15 + w0 * 0.4)} ${r1(y - h * 0.55)} ${r1(x + w0)} ${y}Z`;
  const leaves = range(fronds).map((i) => {
    const a = lerp(-165, -15, i / (fronds - 1)) + (rand() - 0.5) * 12;
    const len = h * (0.34 + rand() * 0.12);
    const rad = (a * Math.PI) / 180;
    const ex = Math.cos(rad) * len;
    const ey = Math.sin(rad) * len;
    const droop = len * 0.42;
    const bx = ex * 0.55;
    const by = ey * 0.55 - len * 0.14;
    const wd = len * 0.11;
    return (
      <path
        key={i}
        d={`M0 0Q${r1(bx)} ${r1(by - wd)} ${r1(ex)} ${r1(ey + droop)}Q${r1(bx + wd * 0.4)} ${r1(by + wd)} 0 0Z`}
        transform={`translate(${r1(tx)} ${r1(ty)})`}
      />
    );
  });
  return (
    <g fill={color}>
      <path d={trunk} />
      {leaves}
      <circle cx={r1(tx - 6)} cy={r1(ty + 10)} r={h * 0.02} />
      <circle cx={r1(tx + 8)} cy={r1(ty + 14)} r={h * 0.02} />
    </g>
  );
}

/** Thatched village hut silhouette. */
export function Hut({ x, y, w, color, roof }: { x: number; y: number; w: number; color: string; roof?: string }): ReactNode {
  const h = w * 0.42;
  return (
    <g>
      <rect x={x} y={y - h} width={w} height={h} fill={color} />
      <path d={`M${r1(x - w * 0.12)} ${r1(y - h + 4)}L${r1(x + w / 2)} ${r1(y - h - w * 0.5)}L${r1(x + w * 1.12)} ${r1(y - h + 4)}Z`} fill={roof ?? color} />
      <rect x={r1(x + w * 0.4)} y={r1(y - h * 0.62)} width={r1(w * 0.2)} height={r1(h * 0.62)} fill="rgba(0,0,0,0.28)" />
    </g>
  );
}

/** Row of village silhouettes: huts and palms along a horizon. */
export function Village({
  seed,
  x,
  y,
  w,
  color,
  roof,
  palm = [110, 170],
}: {
  seed: number;
  x: number;
  y: number;
  w: number;
  color: string;
  roof?: string;
  /** min / max palm height */
  palm?: [number, number];
}): ReactNode {
  const rand = rng(seed);
  const items: ReactNode[] = [];
  let cx = x + 20;
  let i = 0;
  while (cx < x + w - 60) {
    if (i % 3 === 1) {
      items.push(<Hut key={`h${i}`} x={cx} y={y} w={70 + rand() * 30} color={color} roof={roof} />);
      cx += 120 + rand() * 40;
    } else {
      const th = palm[0] + rand() * (palm[1] - palm[0]);
      items.push(<PalmTree key={`p${i}`} x={cx} y={y} h={th} lean={(rand() - 0.5) * 0.3} color={color} seed={seed + i * 7} />);
      cx += 60 + rand() * 60;
    }
    i++;
  }
  return (
    <g>
      {items}
      <rect x={x} y={y - 4} width={w} height={220} fill={color} />
    </g>
  );
}

/** Gentle river waves — layered sine ribbons. */
export function Waves({
  x,
  y,
  w,
  rows = 4,
  amp = 10,
  color,
  opacity = 0.35,
}: {
  x: number;
  y: number;
  w: number;
  rows?: number;
  amp?: number;
  color: string;
  opacity?: number;
}): ReactNode {
  return (
    <g fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={opacity}>
      {range(rows).map((i) => {
        const yy = y + i * 26;
        let d = `M${x} ${yy}`;
        for (let px = x; px < x + w; px += 60) {
          d += `q15 ${-amp} 30 0t30 0`;
        }
        return <path key={i} d={d} strokeOpacity={1 - i * 0.16} />;
      })}
    </g>
  );
}

/** Hanging mango-leaf garland (āmpātā toran) — festive fringe for a top edge. */
export function LeafGarland({ x, y, w, color, seed = 5, count = 22 }: { x: number; y: number; w: number; color: string; seed?: number; count?: number }): ReactNode {
  const rand = rng(seed);
  const step = w / count;
  return (
    <g fill={color}>
      <path d={`M${x} ${y}Q${x + w / 2} ${y + 34} ${x + w} ${y}`} stroke={color} strokeWidth="3" fill="none" />
      {range(count).map((i) => {
        const t = (i + 0.5) / count;
        const px = x + t * w;
        const py = y + 2 * 34 * 0.5 * (1 - Math.pow(2 * t - 1, 2)) * 0.5 + 0;
        const len = 46 + rand() * 20;
        return <path key={i} d={ellipsePath(px, py + len * 0.5 + 6, 7, len * 0.5, 90)} opacity={0.85} transform={`rotate(${r1((rand() - 0.5) * 16)} ${r1(px)} ${r1(py)})`} />;
      })}
    </g>
  );
}
