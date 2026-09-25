import { darken, lighten, mix, readableOn } from "../../color";
import { BdFlag, Dove, PaddyField, SunBurst, SunDisc } from "../motifs/nature";
import { Grain, InsetFrame, RibbonBanner, Starfield, Vignette } from "../motifs/ornament";
import { CreditTab, DatePill, FooterBand, PlatePanel } from "./common";
import type { Theme, ThemeCtx } from "./types";

/**
 * Victory Day — flag-red sun rising over golden paddy, doves overhead, deep-green field.
 */
function Back({ uid, W, H, p, has, r }: ThemeCtx) {
  const mid = mix(p.bgFrom, p.bgTo, 0.5);
  const seed = r.seed;
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bgFrom} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={p.bgTo} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="600" cy="560" r="820" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.accent} stopOpacity="0.34" />
          <stop offset="0.6" stopColor={p.accent} stopOpacity="0.06" />
          <stop offset="1" stopColor={p.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-bg)`} />
      <rect width={W} height={H} fill={`url(#${uid}-glow)`} />

      {has("sunburst") ? <SunBurst uid={uid} cx={600} cy={560} inner={300} outer={1250} count={48} color={p.accent} opacity={0.15} rotate={3} /> : null}
      {has("stars") ? <Starfield seed={seed + 3} x={40} y={30} w={1120} h={330} count={26} color={lighten(p.accent, 0.35)} /> : null}
      {has("sun") ? (
        <SunDisc uid={uid} cx={600} cy={610} r={372} from={lighten(p.secondary, 0.14)} to={darken(p.secondary, 0.32)} ring={p.accent} halo={p.accent} />
      ) : null}

      {has("flags") ? (
        <>
          <BdFlag x={70} y={92} w={236} rotate={-6} poleLen={470} phase={0.4} />
          <g transform={`translate(${W} 0) scale(-1 1)`}>
            <BdFlag x={70} y={92} w={236} rotate={-6} poleLen={470} phase={1.6} />
          </g>
        </>
      ) : null}

      {has("paddy") ? (
        <PaddyField
          seed={seed}
          rows={[
            { count: 48, height: 340, baseY: 1500, depth: 0.7, scale: 0.72, edgeBoost: 0.35 },
            { count: 36, height: 420, baseY: 1570, depth: 0.4, scale: 0.88, edgeBoost: 0.7 },
            { count: 24, height: 500, baseY: 1670, depth: 0.04, scale: 1.1, edgeBoost: 1.1 },
          ]}
          ear={mix(p.accent, "#e0a92c", 0.35)}
          earHi={lighten(p.accent, 0.42)}
          stem={mix(p.accent, p.primary, 0.42)}
          leaf={mix(p.primary, "#8ab24a", 0.55)}
          fade={p.bgTo}
        />
      ) : null}
    </svg>
  );
}

function Mid({ W, p, has }: ThemeCtx) {
  if (!has("doves")) return null;
  const shade = mix("#ffffff", p.primary, 0.16);
  return (
    <svg viewBox={`0 0 ${W} 1600`}>
      {/* a pair flanking the date badge */}
      <Dove x={286} y={70} scale={0.4} rotate={-12} fill="#ffffff" shade={shade} glow={p.accent} wing={0.6} />
      <Dove x={916} y={62} scale={0.36} rotate={-8} flip fill="#ffffff" shade={shade} glow={p.accent} wing={0.9} />
      {/* two lower ones gliding past the headline */}
      <Dove x={872} y={990} scale={0.34} rotate={-8} fill="#ffffff" shade={shade} wing={-0.4} />
      <Dove x={104} y={1024} scale={0.28} rotate={-14} flip fill="#ffffff" shade={shade} wing={0.4} />
    </svg>
  );
}

function Plate({ uid, W, H, p, r }: ThemeCtx) {
  const s = r.layout.slots;
  const c = r.content;
  const dark = darken(p.secondary, 0.34);
  return (
    <svg viewBox={`0 0 ${W} ${H}`}>
      {c.dateText && s.dateText ? <DatePill slot={s.dateText} fill={p.footer} stroke={p.accent} opacity={0.88} /> : null}
      {c.subheadline && s.subheadline ? (
        <RibbonBanner x={s.subheadline.x - 60} y={s.subheadline.y - 4} w={s.subheadline.w + 120} h={s.subheadline.h + 8} fold={58} fill={p.secondary} dark={dark} edge={p.paper} />
      ) : null}
      <PlatePanel uid={uid} slot={s.plate} fill={p.panel} stroke={p.accent} opacity={0.93} />
      {c.creditLabel && s.creditLabel ? <CreditTab slot={s.creditLabel} fill={p.accent} stroke={darken(p.accent, 0.3)} /> : null}
      <FooterBand uid={uid} W={W} H={H} fill={p.footer} line={p.accent} />
    </svg>
  );
}

function Front({ uid, W, H, p, has }: ThemeCtx) {
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`}>{has("border") ? <InsetFrame W={W} H={H} inset={16} color={p.accent} width={3} opacity={0.85} /> : null}</svg>
      <div style={{ position: "absolute", inset: 0 }}>
        <Vignette uid={uid} W={W} H={H} color="#00140d" strength={0.4} />
      </div>
      <div style={{ position: "absolute", inset: 0 }}>{has("grain") ? <Grain uid={uid} W={W} H={H} opacity={0.3} /> : null}</div>
    </>
  );
}

export const victoryTheme: Theme = {
  id: "victory",
  name: "Victory",
  motifPool: ["sunburst", "sun", "flags", "paddy", "doves", "stars", "border", "grain"],
  Back,
  Mid,
  Plate,
  Front,
  textColors: (p) => ({
    sub: readableOn(p.secondary, p.paper, p.ink),
    date: readableOn(p.footer, p.paper, p.ink),
    credit: readableOn(p.accent, "#ffffff", p.ink),
    footer: p.footerText,
  }),
};
