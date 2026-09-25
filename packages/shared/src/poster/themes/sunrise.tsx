import { darken, mix, readableOn } from "../../color";
import { Village } from "../motifs/folk";
import { Grain, Halftone, Starfield } from "../motifs/ornament";
import { DotRing } from "../motifs/festive";
import { CreditTab, DatePill, FooterBand, PlatePanel } from "./common";
import type { Theme, ThemeCtx } from "./types";

/**
 * Sunrise — a warm, modern look: cream sun over a gradient sky, halftone dots, village silhouettes,
 * circular portraits and pill-shaped labels.
 */
function Back({ uid, W, H, p, has, r }: ThemeCtx) {
  const navy = p.ink;
  const c = r.slots[0]!;
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bgFrom} />
          <stop offset="1" stopColor={p.bgTo} />
        </linearGradient>
        <radialGradient id={`${uid}-sunglow`} cx={cx} cy={cy} r="640" gradientUnits="userSpaceOnUse">
          <stop offset="0.3" stopColor={p.paper} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.paper} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-bg)`} />
      <circle cx={cx} cy={cy} r={640} fill={`url(#${uid}-sunglow)`} />
      {has("sun") ? (
        <g fill="none" stroke={p.paper}>
          <circle cx={cx} cy={cy} r={c.w * 0.72} strokeWidth="3" strokeOpacity="0.55" />
          <circle cx={cx} cy={cy} r={c.w * 0.84} strokeWidth="2" strokeOpacity="0.32" strokeDasharray="2 12" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={c.w * 0.98} strokeWidth="2" strokeOpacity="0.2" />
        </g>
      ) : null}
      {has("dots") ? <DotRing cx={cx} cy={cy} r={c.w * 0.62} count={48} dot={4.5} color={p.paper} opacity={0.75} /> : null}
      {has("halftone") ? (
        <>
          <Halftone x={-10} y={-10} w={560} h={480} color={navy} opacity={0.14} spacing={28} maxR={10} direction="down" />
          <Halftone x={640} y={-10} w={560} h={340} color={navy} opacity={0.1} spacing={28} maxR={9} direction="down" />
        </>
      ) : null}
      {has("sparkles") ? <Starfield seed={r.seed + 9} x={30} y={40} w={1140} h={700} count={22} color={p.paper} minS={6} maxS={18} /> : null}
      {has("village") ? <Village seed={r.seed} x={-10} y={1268} w={1220} color={mix(navy, p.bgTo, 0.1)} roof={darken(navy, 0.1)} /> : null}
    </svg>
  );
}

function Plate({ uid, W, H, p, r }: ThemeCtx) {
  const s = r.layout.slots;
  const c = r.content;
  const navy = p.panel;
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      {c.dateText && s.dateText ? <DatePill slot={s.dateText} fill={navy} opacity={0.92} /> : null}
      {c.subheadline && s.subheadline ? (
        <rect
          x={s.subheadline.x - 26}
          y={s.subheadline.y}
          width={s.subheadline.w + 52}
          height={s.subheadline.h}
          rx={s.subheadline.h / 2}
          fill={p.paper}
          stroke={navy}
          strokeWidth="3"
        />
      ) : null}
      <PlatePanel uid={uid} slot={s.plate} fill={navy} radius={32} stroke={p.accent} strokeWidth={3.5} opacity={0.97} />
      {c.creditLabel && s.creditLabel ? <CreditTab slot={s.creditLabel} fill={p.accent} shape="round" /> : null}
      <FooterBand uid={uid} W={W} H={H} fill={navy} line={p.accent} lineHeight={6} />
    </svg>
  );
}

function Front({ uid, W, H, has }: ThemeCtx) {
  return <div style={{ position: "absolute", inset: 0 }}>{has("grain") ? <Grain uid={uid} W={W} H={H} opacity={0.28} /> : null}</div>;
}

export const sunriseTheme: Theme = {
  id: "sunrise",
  name: "Sunrise",
  motifPool: ["sun", "dots", "halftone", "sparkles", "village", "grain"],
  Back,
  Plate,
  Front,
  textColors: (p) => ({
    date: p.paper,
    sub: p.panel,
    credit: readableOn(p.accent, "#ffffff", p.panel),
    footer: p.footerText,
  }),
};
