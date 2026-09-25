import type { ReactNode } from "react";
import { darken, lighten } from "../../color";
import { DiamondRule } from "../motifs/ornament";
import type { PlateSlot, TextSlot } from "../types";

/**
 * Reusable "chrome" shapes shared by the themes: the name plate, credit tab, date pill and footer band.
 * They only draw shapes — the engine places the text on top using the layout's slots.
 */

export function PlatePanel({
  uid,
  slot,
  fill,
  radius = 26,
  stroke,
  strokeWidth = 3.5,
  inner = true,
  opacity = 0.95,
  pad = { x: 34, y: 22 },
  shadow = true,
  gradient = [0.07, 0.22],
}: {
  uid: string;
  slot: PlateSlot;
  fill: string;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
  inner?: boolean;
  opacity?: number;
  pad?: { x: number; y: number };
  shadow?: boolean;
  /** [lighten top, darken bottom] — use small values for light panels */
  gradient?: [number, number];
}): ReactNode {
  const x = slot.x - pad.x;
  const y = slot.y - pad.y;
  const w = slot.w + pad.x * 2;
  const h = slot.h + pad.y * 2;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(fill, gradient[0])} stopOpacity={opacity} />
          <stop offset="1" stopColor={darken(fill, gradient[1])} stopOpacity={opacity} />
        </linearGradient>
        <filter id={`${uid}-plate-sh`} x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={radius} fill={`url(#${uid}-plate)`} stroke={stroke} strokeWidth={stroke ? strokeWidth : 0} filter={shadow ? `url(#${uid}-plate-sh)` : undefined} />
      {inner && stroke ? (
        <rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} rx={Math.max(4, radius - 8)} fill="none" stroke={stroke} strokeOpacity="0.42" strokeWidth="1.6" />
      ) : null}
    </g>
  );
}

/** The little tab that carries the credit label ("প্রচারে"). */
export function CreditTab({
  slot,
  fill,
  stroke,
  shape = "hex",
}: {
  slot: TextSlot;
  fill: string;
  stroke?: string;
  shape?: "hex" | "round" | "para";
}): ReactNode {
  const { x, y, w, h } = slot;
  let d: string;
  if (shape === "round") {
    d = `M${x + h / 2} ${y}H${x + w - h / 2}A${h / 2} ${h / 2} 0 0 1 ${x + w - h / 2} ${y + h}H${x + h / 2}A${h / 2} ${h / 2} 0 0 1 ${x + h / 2} ${y}Z`;
  } else if (shape === "para") {
    d = `M${x + 16} ${y}H${x + w + 16}L${x + w} ${y + h}H${x}Z`;
  } else {
    d = `M${x - 16} ${y + h / 2}L${x} ${y}H${x + w}L${x + w + 16} ${y + h / 2}L${x + w} ${y + h}H${x}Z`;
  }
  return <path d={d} fill={fill} stroke={stroke ?? "none"} strokeWidth={stroke ? 2 : 0} strokeLinejoin="round" />;
}

export function DatePill({ slot, fill, stroke, opacity = 0.75 }: { slot: TextSlot; fill: string; stroke?: string; opacity?: number }): ReactNode {
  const h = slot.h - 12;
  return <rect x={slot.x + 18} y={slot.y + 6} width={slot.w - 36} height={h} rx={h / 2} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={stroke ? 2.5 : 0} />;
}

/** Footer band with an accent rule on top. */
export function FooterBand({
  uid,
  W,
  H,
  height = 118,
  fill,
  line,
  ornament = true,
  lineHeight = 6,
}: {
  uid: string;
  W: number;
  H: number;
  height?: number;
  fill: string;
  line: string;
  ornament?: boolean;
  lineHeight?: number;
}): ReactNode {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-foot`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(fill, 0.06)} />
          <stop offset="1" stopColor={darken(fill, 0.25)} />
        </linearGradient>
      </defs>
      <rect x="0" y={H - height} width={W} height={height} fill={`url(#${uid}-foot)`} />
      <rect x="0" y={H - height} width={W} height={lineHeight} fill={line} />
      <rect x="0" y={H - height + lineHeight + 6} width={W} height="2" fill={line} opacity="0.5" />
      {ornament ? <DiamondRule cx={W / 2} y={H - height + 32} w={300} color={line} opacity={0.75} /> : null}
    </g>
  );
}
