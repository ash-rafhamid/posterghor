import { darken, lighten, mix, readableOn } from "../../color";
import { Crescent, Lantern, MosqueSkyline, Star5 } from "../motifs/festive";
import { Grain, Starfield, Vignette } from "../motifs/ornament";
import { CreditTab, DatePill, FooterBand, PlatePanel } from "./common";
import type { Theme, ThemeCtx } from "./types";

/**
 * Eid / Festival — night sky, a golden crescent, hanging lanterns, a mosque skyline with lit windows,
 * hexagonal (Islamic tile) portrait frames.
 */
function Back({ uid, W, H, p, has, r }: ThemeCtx) {
  const gold = p.accent;
  const sky = mix(p.bgTo, "#000000", 0.34);
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bgFrom} />
          <stop offset="1" stopColor={p.bgTo} />
        </linearGradient>
        <radialGradient id={`${uid}-moonlight`} cx="880" cy="270" r="700" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={gold} stopOpacity="0.22" />
          <stop offset="1" stopColor={gold} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-bg)`} />
      <rect width={W} height={H} fill={`url(#${uid}-moonlight)`} />
      {has("stars") ? <Starfield seed={r.seed} x={20} y={20} w={1160} h={1000} count={64} color={lighten(gold, 0.45)} minS={4} maxS={13} /> : null}
      {has("crescent") ? (
        <>
          <Crescent uid={uid} cx={900} cy={262} r={150} from={lighten(gold, 0.4)} to={darken(gold, 0.12)} glow={gold} tilt={-20} />
          <Star5 x={1030} y={168} r={24} color={lighten(gold, 0.35)} rotate={8} />
          <Star5 x={842} y={396} r={14} color={lighten(gold, 0.3)} />
          <Star5 x={1096} y={318} r={11} color={lighten(gold, 0.3)} rotate={-10} />
        </>
      ) : null}
      {has("mosque") ? <MosqueSkyline uid={uid} x={-20} y={1296} w={1240} color={sky} window={lighten(gold, 0.25)} seed={r.seed} /> : null}
      {has("lanterns") ? (
        <>
          <Lantern uid={uid} n={1} x={96} top={-10} drop={118} w={108} h={146} body={darken(gold, 0.05)} glow={lighten(gold, 0.25)} metal={darken(gold, 0.25)} />
          <Lantern uid={uid} n={2} x={246} top={-10} drop={44} w={84} h={116} body={darken(gold, 0.05)} glow={lighten(gold, 0.25)} metal={darken(gold, 0.25)} />
          <Lantern uid={uid} n={3} x={1110} top={-10} drop={92} w={96} h={130} body={darken(gold, 0.05)} glow={lighten(gold, 0.25)} metal={darken(gold, 0.25)} />
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
      {c.dateText && s.dateText ? <DatePill slot={s.dateText} fill={darken(p.bgFrom, 0.3)} opacity={0.8} stroke={p.accent} /> : null}
      {c.subheadline && s.subheadline ? (
        <rect
          x={s.subheadline.x - 26}
          y={s.subheadline.y}
          width={s.subheadline.w + 52}
          height={s.subheadline.h}
          rx={s.subheadline.h / 2}
          fill={darken(p.bgFrom, 0.35)}
          fillOpacity="0.72"
          stroke={p.accent}
          strokeWidth="2.5"
        />
      ) : null}
      <PlatePanel uid={uid} slot={s.plate} fill={p.panel} radius={28} stroke={p.accent} strokeWidth={3.5} opacity={0.95} />
      {c.creditLabel && s.creditLabel ? <CreditTab slot={s.creditLabel} fill={p.accent} shape="hex" stroke={darken(p.accent, 0.3)} /> : null}
      <FooterBand uid={uid} W={W} H={H} fill={p.footer} line={p.accent} />
    </svg>
  );
}

function Front({ uid, W, H, has }: ThemeCtx) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0 }}>
        <Vignette uid={uid} W={W} H={H} color="#000a0f" strength={0.42} />
      </div>
      <div style={{ position: "absolute", inset: 0 }}>{has("grain") ? <Grain uid={uid} W={W} H={H} opacity={0.3} /> : null}</div>
    </>
  );
}

export const eidTheme: Theme = {
  id: "eid",
  name: "Eid",
  motifPool: ["stars", "crescent", "mosque", "lanterns", "grain"],
  Back,
  Plate,
  Front,
  textColors: (p) => ({
    date: p.accent,
    sub: p.paper,
    credit: readableOn(p.accent, "#ffffff", "#0a1a1a"),
    footer: p.footerText,
  }),
};
