import { darken, lighten } from "../../color";
import { AlponaBand, AlponaRosette, Marigold } from "../motifs/folk";
import { DiamondRule, Grain } from "../motifs/ornament";
import { CreditTab, DatePill, FooterBand, PlatePanel } from "./common";
import type { Theme, ThemeCtx } from "./types";

/**
 * Greetings (Pohela Boishakh spirit) — cream paper, a red sun ringed by alpona, marigolds, scrapbook polaroids.
 */
function Back({ uid, W, H, p, has, r }: ThemeCtx) {
  const c = r.slots[0]!;
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h * 0.48;
  const rad = c.w * 0.66;
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bgFrom} />
          <stop offset="1" stopColor={p.bgTo} />
        </linearGradient>
        <radialGradient id={`${uid}-sun`} cx="0.42" cy="0.36" r="0.85">
          <stop offset="0" stopColor={lighten(p.secondary, 0.16)} />
          <stop offset="1" stopColor={darken(p.secondary, 0.28)} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-bg)`} />
      {has("alpona") ? (
        <g opacity="0.4">
          <AlponaRosette cx={cx} cy={cy} r={rad * 1.5} color={p.secondary} petals={24} weight={2.5} fill={0.08} />
          <AlponaRosette cx={cx} cy={cy} r={rad * 1.22} color={p.accent} petals={20} weight={2.5} fill={0.14} />
        </g>
      ) : null}
      {has("sun") ? <circle cx={cx} cy={cy} r={rad} fill={`url(#${uid}-sun)`} /> : null}
      {has("sun") ? <circle cx={cx} cy={cy} r={rad + 22} fill="none" stroke={p.secondary} strokeWidth="3" strokeDasharray="2 11" strokeLinecap="round" /> : null}
      {has("band") ? <AlponaBand x={0} y={62} w={W} color={p.secondary} r={34} gap={98} weight={2.6} /> : null}
      {has("marigold") ? (
        <>
          <Marigold cx={62} cy={1120} r={66} outer={p.accent} mid={lighten(p.accent, 0.18)} inner={darken(p.accent, 0.12)} centre={p.secondary} />
          <Marigold cx={150} cy={1180} r={46} outer={lighten(p.accent, 0.12)} mid={p.accent} inner={darken(p.accent, 0.2)} centre={p.secondary} />
          <Marigold cx={1138} cy={1120} r={66} outer={p.accent} mid={lighten(p.accent, 0.18)} inner={darken(p.accent, 0.12)} centre={p.secondary} />
          <Marigold cx={1050} cy={1180} r={46} outer={lighten(p.accent, 0.12)} mid={p.accent} inner={darken(p.accent, 0.2)} centre={p.secondary} />
        </>
      ) : null}
    </svg>
  );
}

function Plate({ uid, W, H, p, r }: ThemeCtx) {
  const s = r.layout.slots;
  const c = r.content;
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      {c.dateText && s.dateText ? <DatePill slot={s.dateText} fill={p.secondary} opacity={0.96} stroke={darken(p.secondary, 0.3)} /> : null}
      {c.subheadline && s.subheadline ? (
        <>
          <DiamondRule cx={W / 2} y={s.subheadline.y - 6} w={300} color={p.secondary} />
          <DiamondRule cx={W / 2} y={s.subheadline.y + s.subheadline.h + 8} w={300} color={p.secondary} opacity={0.6} />
        </>
      ) : null}
      <PlatePanel uid={uid} slot={s.plate} fill={p.panel} radius={22} stroke={p.secondary} strokeWidth={4} opacity={0.98} gradient={[0, 0.05]} />
      {c.creditLabel && s.creditLabel ? <CreditTab slot={s.creditLabel} fill={p.secondary} shape="round" stroke={darken(p.secondary, 0.3)} /> : null}
      <FooterBand uid={uid} W={W} H={H} fill={p.footer} line={p.accent} />
    </svg>
  );
}

function Front({ uid, W, H, has }: ThemeCtx) {
  return <div style={{ position: "absolute", inset: 0 }}>{has("grain") ? <Grain uid={uid} W={W} H={H} opacity={0.4} /> : null}</div>;
}

export const boishakhTheme: Theme = {
  id: "boishakh",
  name: "Boishakh",
  motifPool: ["alpona", "sun", "band", "marigold", "grain"],
  Back,
  Plate,
  Front,
  textColors: (p) => ({
    date: p.paper,
    sub: p.ink,
    credit: p.paper,
    footer: p.footerText,
  }),
};
