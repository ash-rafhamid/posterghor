"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The visual vocabulary of the site — hand-built SVG in the spirit of Bangladeshi rickshaw art:
 * flat enamel colours, thick violet-black outlines, beads, petals, scallops.
 * Colours come from the theme tokens, so re-skinning the site re-paints these too.
 */

const INK = "var(--color-ink)";
const c = (name: string) => `var(--color-${name})`;
const R = (n: number) => Math.round(n * 100) / 100;
/** `relative` unless the caller positions the element itself (Tailwind would let `relative` beat `absolute`) */
const pos = (className?: string) => (className && /(^|\s)(absolute|fixed|sticky|relative)(\s|$)/.test(className) ? "" : "relative");

/* ─────────────────────────────  the wheel  ───────────────────────────── */

/** A rickshaw wheel: tyre, painted rim with bead studs, spokes, flower hub. */
export function Wheel({ size = 96, spokes = 16, spin = false, filled = true, rim = "pink", hub = "gold", className, style }: { size?: number; spokes?: number; spin?: boolean; filled?: boolean; rim?: string; hub?: string; className?: string; style?: CSSProperties }) {
  const lines = Array.from({ length: spokes }, (_, i) => {
    const a = ((i * 360) / spokes) * (Math.PI / 180);
    return <line key={i} x1={R(50 + Math.cos(a) * 11)} y1={R(50 + Math.sin(a) * 11)} x2={R(50 + Math.cos(a) * 35)} y2={R(50 + Math.sin(a) * 35)} />;
  });
  const beads = 2 * Math.PI * 39.5;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className={cn(spin && "animate-spin-slow", className)} style={style}>
      {filled ? <circle cx="50" cy="50" r="36" fill="#fff" /> : null}
      <circle cx="50" cy="50" r="46" fill="none" stroke={INK} strokeWidth="7" />
      <circle cx="50" cy="50" r="39.5" fill="none" stroke={c(rim)} strokeWidth="7.4" />
      <circle cx="50" cy="50" r="43.2" fill="none" stroke={INK} strokeWidth="1.6" />
      <circle cx="50" cy="50" r="35.8" fill="none" stroke={INK} strokeWidth="1.6" />
      <circle cx="50" cy="50" r="39.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`0.01 ${R(beads / 16)}`} />
      <g stroke={INK} strokeWidth="2.2" strokeLinecap="round">
        {lines}
      </g>
      <circle cx="50" cy="50" r="11.5" fill={c(hub)} stroke={INK} strokeWidth="3.4" />
      <circle cx="50" cy="50" r="4.6" fill={c("pink")} stroke={INK} strokeWidth="2" />
    </svg>
  );
}

/* ─────────────────────────────  flowers  ───────────────────────────── */

const PETAL = "M0 0C11 -12 13 -34 0 -54C-13 -34 -11 -12 0 0Z";

/** Shapla — the water-lily — on its leaf. */
export function Lotus({ size = 120, className, style }: { size?: number; className?: string; style?: CSSProperties }) {
  const petal = (angle: number, scale: number, fill: string, key: string) => <path key={key} d={PETAL} transform={`rotate(${angle}) scale(${scale})`} fill={fill} stroke={INK} strokeWidth={3 / scale} strokeLinejoin="round" />;
  return (
    <svg viewBox="0 0 120 92" width={size} height={(size * 92) / 120} aria-hidden className={className} style={style}>
      <ellipse cx="60" cy="81" rx="55" ry="9.5" fill={c("leaf")} stroke={INK} strokeWidth="3" />
      <path d="M60 81 L88 72" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <g transform="translate(60 78)">
        {petal(-66, 0.82, c("rose"), "a")}
        {petal(66, 0.82, c("rose"), "b")}
        {petal(-38, 0.95, c("pink"), "c")}
        {petal(38, 0.95, c("pink"), "d")}
        {petal(-15, 1, c("blush"), "e")}
        {petal(15, 1, c("blush"), "f")}
        {petal(0, 1, "#fff", "g")}
        <circle cx="0" cy="-3" r="5" fill={c("gold")} stroke={INK} strokeWidth="2.4" />
      </g>
    </svg>
  );
}

/** Marigold (গাঁদা) — a ring of round petals. */
export function Marigold({ size = 64, className, style }: { size?: number; className?: string; style?: CSSProperties }) {
  const ring = (n: number, radius: number, r: number, fill: string, offset = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((i + offset) * 360) / n * (Math.PI / 180);
      return <circle key={`${radius}-${i}`} cx={R(32 + Math.cos(a) * radius)} cy={R(32 + Math.sin(a) * radius)} r={r} fill={fill} stroke={INK} strokeWidth="2.4" />;
    });
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={className} style={style}>
      {ring(12, 20.5, 8.6, c("gold-deep"))}
      {ring(9, 12.5, 7.4, c("gold"), 0.5)}
      <circle cx="32" cy="32" r="7.4" fill="#ff8a1f" stroke={INK} strokeWidth="2.4" />
    </svg>
  );
}

/** Four-point sparkle. */
export function Sparkle({ size = 22, fill = "gold", className, style }: { size?: number; fill?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={className} style={style}>
      <path d="M12 1.5Q13.6 10.4 22.5 12Q13.6 13.6 12 22.5Q10.4 13.6 1.5 12Q10.4 10.4 12 1.5Z" fill={c(fill)} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/* ─────────────────────────────  repeating trims  ───────────────────────────── */

/** Shop-front awning: striped, scalloped, tasselled. Repeats to any width. */
export function Awning({ className, colors = ["pink", "white"], stripe = 44, height = 46 }: { className?: string; colors?: string[]; stripe?: number; height?: number }) {
  const id = useId();
  const n = colors.length;
  const r = stripe / 2;
  const top = 14;
  return (
    <svg width="100%" height={height} aria-hidden className={cn("block", className)}>
      <defs>
        <pattern id={id} width={stripe * n} height={height} patternUnits="userSpaceOnUse">
          {colors.map((col, i) => {
            const x = i * stripe;
            return (
              <g key={i}>
                <path d={`M${x} -3H${x + stripe}V${top}A${r} ${r} 0 0 1 ${x} ${top}Z`} fill={col === "white" ? "#fff" : c(col)} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
                <circle cx={x + r} cy={top + r + 1} r="3.6" fill={c("gold")} stroke={INK} strokeWidth="2" />
              </g>
            );
          })}
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}

/** A string of paper pennants — the flags every rally and festival hangs from lamp-post to lamp-post. */
export function Bunting({ className, height = 66, colors = ["pink", "gold", "teal", "white"], flags = 6, tile = 216 }: { className?: string; height?: number; colors?: string[]; flags?: number; tile?: number }) {
  const id = useId();
  const sag = 40;
  const y0 = 7;
  const w = 27;
  const h = 32;
  const items = Array.from({ length: flags }, (_, i) => {
    const t = (i + 0.5) / flags;
    const x = tile * t;
    const y = y0 + 4 * (sag / 2) * t * (1 - t); // y0 + sag*2*t*(1-t)
    const slope = ((4 * (sag / 2)) * (1 - 2 * t)) / tile;
    const angle = (Math.atan(slope) * 180) / Math.PI;
    const col = colors[i % colors.length]!;
    return (
      <g key={i} transform={`translate(${R(x)} ${R(y)}) rotate(${R(angle)})`}>
        <path d={`M${-w / 2} 0H${w / 2}L0 ${h}Z`} fill={col === "white" ? "#fff" : c(col)} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <circle cx="0" cy={h * 0.36} r="3" fill={col === "gold" || col === "white" ? c("pink") : c("gold")} stroke={INK} strokeWidth="1.6" />
      </g>
    );
  });
  return (
    <svg width="100%" height={height} aria-hidden className={cn("block", className)}>
      <defs>
        <pattern id={id} width={tile} height={height} patternUnits="userSpaceOnUse">
          <path d={`M0 ${y0}Q${tile / 2} ${y0 + sag} ${tile} ${y0}`} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          {items}
          <circle cx="0" cy={y0} r="3.2" fill={c("gold")} stroke={INK} strokeWidth="1.8" />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}

/** Wavy vine with leaves and berries — divider / underline. */
export function Vine({ className, height = 30, tile = 140 }: { className?: string; height?: number; tile?: number }) {
  const id = useId();
  const mid = height / 2;
  const leaf = "M0 0C6 -9 15 -9 22 0C15 9 6 9 0 0Z";
  return (
    <svg width="100%" height={height} aria-hidden className={cn("block", className)}>
      <defs>
        <pattern id={id} width={tile} height={height} patternUnits="userSpaceOnUse">
          <path d={`M0 ${mid}C${tile * 0.17} ${mid - 13} ${tile * 0.33} ${mid - 13} ${tile * 0.5} ${mid}S${tile * 0.83} ${mid + 13} ${tile} ${mid}`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path d={leaf} transform={`translate(${tile * 0.2} ${mid - 8}) rotate(-38)`} fill={c("leaf")} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d={leaf} transform={`translate(${tile * 0.72} ${mid + 8}) rotate(38)`} fill={c("leaf")} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx={tile * 0.5} cy={mid} r="5" fill={c("pink")} stroke={INK} strokeWidth="2.4" />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}

/* ─────────────────────────────  badges  ───────────────────────────── */

function burst(points: number, outer: number, inner: number) {
  return Array.from({ length: points * 2 }, (_, i) => {
    const rad = i % 2 ? inner : outer;
    const a = (i * Math.PI) / points - Math.PI / 2;
    return `${R(50 + Math.cos(a) * rad)},${R(50 + Math.sin(a) * rad)}`;
  }).join(" ");
}

/** Starburst sticker: "NEW!", "2400×3200" … */
export function Sticker({ children, color = "gold", className, style, points = 16 }: { children: ReactNode; color?: string; className?: string; style?: CSSProperties; points?: number }) {
  return (
    <span className={cn(pos(className), "inline-grid place-items-center text-center", className)} style={style}>
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
        <polygon points={burst(points, 48, 41)} fill={c(color)} stroke={INK} strokeWidth="3.2" strokeLinejoin="round" />
      </svg>
      <span className="relative px-[12%]">{children}</span>
    </span>
  );
}

/** Round enamel medallion with a ring of bead studs — for step numbers. */
export function Medallion({ children, size = 52, color = "gold", className }: { children: ReactNode; size?: number; color?: string; className?: string }) {
  const beads = 2 * Math.PI * 38;
  return (
    <span className={cn(pos(className), "inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full">
        <circle cx="50" cy="50" r="46" fill={c(color)} stroke={INK} strokeWidth="5" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeDasharray={`0.01 ${R(beads / 14)}`} />
        <circle cx="50" cy="50" r="31" fill="none" stroke={INK} strokeWidth="2.4" />
      </svg>
      <span className="relative font-display font-extrabold leading-none text-ink" style={{ fontSize: size * 0.4 }}>
        {children}
      </span>
    </span>
  );
}

/* ─────────────────────────────  occasion icons  ───────────────────────────── */

export type OccasionKey = "victory" | "tribute" | "campaign" | "greeting" | "festival";

/** Little painted pictures for the five kinds of poster. */
export function OccasionIcon({ id, size = 56, className }: { id: string; size?: number; className?: string }) {
  const s = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={className}>
      {id === "victory" ? (
        <>
          <g {...s}>
            {[-72, -48, -24, 0, 24, 48, 72].map((a) => {
              const rad = ((a - 90) * Math.PI) / 180;
              return <line key={a} x1={R(32 + Math.cos(rad) * 20)} y1={R(38 + Math.sin(rad) * 20)} x2={R(32 + Math.cos(rad) * 27)} y2={R(38 + Math.sin(rad) * 27)} />;
            })}
          </g>
          <circle cx="32" cy="38" r="14" fill={c("gold")} {...s} />
          <path d="M3 44Q17 37 32 44T61 44V60H3Z" fill={c("leaf")} {...s} />
          <path d="M3 52Q17 46 32 52T61 52" fill="none" {...s} strokeWidth="2.2" />
        </>
      ) : id === "tribute" ? (
        <>
          <ellipse cx="32" cy="55" rx="19" ry="5" fill={c("teal")} {...s} />
          <rect x="24" y="27" width="16" height="27" rx="3" fill="#fff" {...s} />
          <path d="M24 34c3 4 5-1 8 3s5-2 8 2" fill="none" {...s} strokeWidth="2.2" />
          <path d="M32 6c7 7 8 12 4 17-2 2-6 2-8 0-4-5-3-10 4-17Z" fill={c("gold")} {...s} />
          <path d="M32 15c3 3 3 5 1.6 7-.8 1-2.4 1-3.2 0-1.4-2-1.4-4 1.6-7Z" fill={c("pink")} stroke={INK} strokeWidth="1.8" />
        </>
      ) : id === "campaign" ? (
        <>
          <path d="M16 26 46 11v42L16 38Z" fill={c("pink")} {...s} />
          <rect x="7" y="25" width="10" height="14" rx="3" fill={c("gold")} {...s} />
          <path d="M20 39 24 55h8l-3-14" fill={c("teal")} {...s} />
          <path d="M51 22c4 6 4 14 0 20M56 16c7 10 7 22 0 32" fill="none" {...s} />
        </>
      ) : id === "greeting" ? (
        <Marigold size={64} />
      ) : (
        <>
          <path d="M40 6A26 26 0 1 0 40 58A20 20 0 1 1 40 6Z" fill={c("gold")} {...s} />
          <path d="M47 14l2.6 6.2 6.6.6-5 4.4 1.6 6.5L47 28l-5.8 3.7 1.6-6.5-5-4.4 6.6-.6Z" fill="#fff" {...s} strokeWidth="2.4" />
        </>
      )}
    </svg>
  );
}

/* ─────────────────────────────  frames  ───────────────────────────── */

/** String lights running round the inside of a `.hoarding` frame. */
export function Bulbs() {
  return (
    <span aria-hidden className="bulbs">
      <i className="h t a" />
      <i className="h t c" />
      <i className="h b a" />
      <i className="h b c" />
      <i className="v l a" />
      <i className="v l c" />
      <i className="v r a" />
      <i className="v r c" />
    </span>
  );
}

/** A poster hung in a painted, lit frame. */
export function Hoarding({ children, className, frame = "pink", lights = true }: { children: ReactNode; className?: string; frame?: string; lights?: boolean }) {
  return (
    <div className={cn("hoarding", className)} style={{ ["--frame" as string]: c(frame) }}>
      {lights ? <Bulbs /> : null}
      <div className="hoarding-in">{children}</div>
    </div>
  );
}

/** Round white coin ringed with coloured bead studs — the occasion pickers. */
export function Coin({ children, size = 132, ring = "pink", className }: { children: ReactNode; size?: number; ring?: string; className?: string }) {
  const beads = 2 * Math.PI * 39;
  return (
    <span className={cn(pos(className), "inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 h-full w-full">
        <circle cx="50" cy="50" r="46.5" fill="#fff" stroke={INK} strokeWidth="4.5" />
        <circle cx="50" cy="50" r="39" fill="none" stroke={c(ring)} strokeWidth="5" strokeLinecap="round" strokeDasharray={`0.01 ${R(beads / 20)}`} />
        <circle cx="50" cy="50" r="33" fill="none" stroke={INK} strokeOpacity="0.16" strokeWidth="1.8" />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

/** A brass drawing-pin. */
export function Pin({ className, color = "gold" }: { className?: string; color?: string }) {
  return (
    <span aria-hidden className={cn("inline-block h-[22px] w-[22px] rounded-full border-[3px] border-ink", className)} style={{ background: `radial-gradient(circle at 32% 30%, #fff 0 12%, ${c(color)} 14%)` }} />
  );
}
