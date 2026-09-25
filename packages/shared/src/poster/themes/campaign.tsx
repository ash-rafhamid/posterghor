import { darken, lighten, readableOn } from "../../color";
import { Confetti, SkewBand, VoteBadge } from "../motifs/festive";
import { SunBurst } from "../motifs/nature";
import { Grain, Halftone, Vignette } from "../motifs/ornament";
import { CreditTab, DatePill, FooterBand, PlatePanel } from "./common";
import type { Theme, ThemeCtx } from "./types";

/**
 * Campaign — rally energy: a diagonal split of two brand colours, rays, halftone, a yellow headline band.
 */
function Back({ uid, W, H, p, has, r }: ThemeCtx) {
  const seed = r.seed;
  const split = `M0 960L${W} 640V${H}H0Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(p.bgFrom, 0.05)} />
          <stop offset="1" stopColor={p.bgTo} />
        </linearGradient>
        <linearGradient id={`${uid}-bot`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={lighten(p.secondary, 0.08)} />
          <stop offset="1" stopColor={darken(p.secondary, 0.3)} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-top)`} />
      {has("rays") ? <SunBurst uid={uid} cx={760} cy={520} inner={120} outer={1500} count={40} color="#ffffff" opacity={0.1} rotate={-4} /> : null}
      {has("halftone") ? (
        <>
          <Halftone x={-10} y={-10} w={600} h={520} color={p.accent} opacity={0.32} spacing={30} maxR={11} direction="down" />
          <Halftone x={620} y={1080} w={600} h={520} color={p.paper} opacity={0.16} spacing={30} maxR={11} direction="up" />
        </>
      ) : null}
      <path d={split} fill={`url(#${uid}-bot)`} />
      <path d={`M0 ${960 - 26}L${W} ${640 - 26}L${W} ${640}L0 ${960}Z`} fill={p.accent} />
      {has("confetti") ? <Confetti seed={seed} x={30} y={40} w={1140} h={620} count={38} colors={[p.accent, p.paper, p.secondary]} /> : null}
    </svg>
  );
}

function Mid({ uid, W, p, has }: ThemeCtx) {
  if (!has("badge")) return null;
  return (
    <svg viewBox={`0 0 ${W} 1600`}>
      <VoteBadge uid={uid} cx={1086} cy={126} r={62} fill={lighten(p.secondary, 0.1)} ring={darken(p.secondary, 0.35)} mark={p.accent} />
    </svg>
  );
}

function Plate({ uid, W, H, p, r }: ThemeCtx) {
  const s = r.layout.slots;
  const c = r.content;
  const hl = s.headline;
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      {c.dateText && s.dateText ? <DatePill slot={s.dateText} fill={p.accent} opacity={1} stroke={darken(p.accent, 0.4)} /> : null}
      <SkewBand x={hl.x - 40} y={hl.y + 12} w={hl.w + 80} h={hl.h - 24} skew={46} fill={p.accent} edge={darken(p.bgTo, 0.5)} />
      {c.subheadline && s.subheadline ? (
        <SkewBand x={s.subheadline.x - 40} y={s.subheadline.y} w={s.subheadline.w + 80} h={s.subheadline.h} skew={22} fill={darken(p.bgTo, 0.45)} />
      ) : null}
      <PlatePanel uid={uid} slot={s.plate} fill={p.panel} radius={14} stroke={p.accent} strokeWidth={3.5} opacity={0.96} />
      {c.creditLabel && s.creditLabel ? <CreditTab slot={s.creditLabel} fill={p.accent} shape="para" stroke={darken(p.accent, 0.4)} /> : null}
      <FooterBand uid={uid} W={W} H={H} fill={p.footer} line={p.secondary} lineHeight={8} />
    </svg>
  );
}

function Front({ uid, W, H, has }: ThemeCtx) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0 }}>
        <Vignette uid={uid} W={W} H={H} color="#000000" strength={0.32} />
      </div>
      <div style={{ position: "absolute", inset: 0 }}>{has("grain") ? <Grain uid={uid} W={W} H={H} opacity={0.26} /> : null}</div>
    </>
  );
}

export const campaignTheme: Theme = {
  id: "campaign",
  name: "Campaign",
  motifPool: ["rays", "halftone", "confetti", "badge", "grain"],
  Back,
  Mid,
  Plate,
  Front,
  textColors: (p) => ({
    date: readableOn(p.accent, "#ffffff", "#0b1a14"),
    sub: "#ffffff",
    credit: readableOn(p.accent, "#ffffff", "#0b1a14"),
    footer: p.footerText,
  }),
};
