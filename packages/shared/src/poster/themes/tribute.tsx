import { darken, lighten, mix, readableOn } from "../../color";
import { Dove } from "../motifs/nature";
import { Candle, Drift, LightBeams, MourningSash, Shapla } from "../motifs/memorial";
import { DiamondRule, Grain, InsetFrame, Vignette } from "../motifs/ornament";
import { CreditTab, FooterBand, PlatePanel } from "./common";
import type { Theme, ThemeCtx } from "./types";

/**
 * Tribute — dignified, low-key. Charcoal field, a soft cone of light on the portrait, shapla lilies,
 * a black mourning sash across the corner and candle glow.
 */
function mainCentre(r: ThemeCtx["r"]): { cx: number; cy: number; rad: number } {
  const s = r.slots[0]!;
  return { cx: s.x + s.w / 2, cy: s.y + s.h * 0.46, rad: Math.max(s.w, s.h) * 0.66 };
}

function Back({ uid, W, H, p, has, r }: ThemeCtx) {
  const { cx, cy, rad } = mainCentre(r);
  const light = lighten(p.paper, 0.1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bgFrom} />
          <stop offset="1" stopColor={p.bgTo} />
        </linearGradient>
        <radialGradient id={`${uid}-spot`} cx={cx} cy={cy} r="780" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={light} stopOpacity="0.30" />
          <stop offset="0.5" stopColor={light} stopOpacity="0.07" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-bg)`} />
      <rect width={W} height={H} fill={`url(#${uid}-spot)`} />
      {has("lightbeams") ? <LightBeams uid={uid} W={W} H={H} color={light} opacity={0.1} x={cx} /> : null}
      {has("halo") ? (
        <g fill="none" stroke={p.accent}>
          <circle cx={cx} cy={cy} r={rad} strokeWidth="2.5" strokeOpacity="0.55" />
          <circle cx={cx} cy={cy} r={rad + 26} strokeWidth="2" strokeOpacity="0.3" strokeDasharray="2 12" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={rad + 60} strokeWidth="1.5" strokeOpacity="0.16" />
        </g>
      ) : null}
      {has("drift") ? <Drift seed={r.seed} x={40} y={80} w={1120} h={1100} count={46} color={lighten(p.paper, 0.2)} maxR={3.4} /> : null}
    </svg>
  );
}

function Mid({ uid, W, p, has, r }: ThemeCtx) {
  const doveShade = mix("#ffffff", p.bgTo, 0.5);
  return (
    <svg viewBox={`0 0 ${W} 1600`}>
      {has("doves") ? (
        <g opacity="0.62">
          <Dove x={928} y={92} scale={0.42} rotate={-14} flip fill="#f3efe6" shade={doveShade} wing={0.8} />
          <Dove x={1040} y={196} scale={0.26} rotate={-8} flip fill="#f3efe6" shade={doveShade} wing={0.2} />
        </g>
      ) : null}
      {has("candles") && r.photoCount === "1" ? (
        <>
          <Candle uid={uid} x={168} y={742} h={250} w={50} n={1} />
          <Candle uid={uid} x={1032} y={742} h={210} w={44} n={2} />
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
      {c.dateText && s.dateText ? <DiamondRule cx={W / 2} y={s.dateText.y + s.dateText.h + 6} w={360} color={p.accent} /> : null}
      {c.subheadline && s.subheadline ? <DiamondRule cx={W / 2} y={s.subheadline.y - 8} w={260} color={p.accent} opacity={0.7} /> : null}
      <PlatePanel uid={uid} slot={s.plate} fill={p.panel} radius={12} stroke={p.accent} strokeWidth={2.5} opacity={0.94} />
      {c.creditLabel && s.creditLabel ? <CreditTab slot={s.creditLabel} fill={p.accent} shape="para" /> : null}
      <FooterBand uid={uid} W={W} H={H} fill={p.footer} line={p.accent} lineHeight={4} />
    </svg>
  );
}

function Front({ uid, W, H, p, has, r }: ThemeCtx) {
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`}>
        {has("border") ? <InsetFrame W={W} H={H} inset={16} color={p.accent} width={2.4} opacity={0.6} /> : null}
        {has("lilies") ? (
          <>
            <Shapla uid={uid} n={1} x={104} y={1452} size={0.62} rotate={-4} petal="#ffffff" tip="#f3cdd8" />
            <Shapla uid={uid} n={2} x={1098} y={1458} size={0.54} rotate={5} petal="#ffffff" tip="#f3cdd8" />
          </>
        ) : null}
        {has("sash") ? <MourningSash size={290} color="#050506" edge={darken(p.paper, 0.1)} /> : null}
      </svg>
      <div style={{ position: "absolute", inset: 0 }}>
        <Vignette uid={uid} W={W} H={H} color="#000000" strength={0.55} />
      </div>
      <div style={{ position: "absolute", inset: 0 }}>{has("grain") ? <Grain uid={uid} W={W} H={H} opacity={0.34} /> : null}</div>
    </>
  );
}

export const tributeTheme: Theme = {
  id: "tribute",
  name: "Tribute",
  motifPool: ["lightbeams", "halo", "drift", "doves", "candles", "lilies", "sash", "border", "grain"],
  Back,
  Mid,
  Plate,
  Front,
  // the supporting line sits directly on the background gradient, so it must read on light *and* dark colourways
  textColors: (p) => ({ date: p.accent, sub: readableOn(mix(p.bgFrom, p.bgTo, 0.6), "#f3efe6", "#141414"), credit: "#111111", footer: p.footerText }),
};
