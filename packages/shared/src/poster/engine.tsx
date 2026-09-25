import { useMemo, type CSSProperties, type ReactNode } from "react";
import { joinParts } from "../bangla";
import { alpha, darken, ensureContrast, lighten, luminance, mix } from "../color";
import { POSTER_HEIGHT, POSTER_WIDTH } from "../constants";
import { buildFontFaceCss, getFont, type FontDef } from "../fonts";
import { getTheme } from "./themes";
import type { ThemeCtx } from "./themes/types";
import type {
  HeadlineStyle,
  Palette,
  PhotoSlot,
  PlateSlot,
  PosterPhoto,
  RealFrame,
  ResolvedPoster,
  TextSlot,
} from "./types";
import { avatarDataUri } from "./avatar";

const W = POSTER_WIDTH;
const H = POSTER_HEIGHT;

export interface PosterCanvasProps {
  resolved: ResolvedPoster;
  /** how a font file name is turned into a URL (data: URI on the server, /fonts/… in the browser) */
  fontUrl: (file: string, def: FontDef) => string;
  /** unique id prefix for SVG ids (one per poster on a page) */
  uid?: string;
  /** draw silhouette placeholders in empty photo slots (studio preview only) */
  placeholders?: boolean;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Base stylesheet
 * ──────────────────────────────────────────────────────────────────────────── */

function familyStack(def: FontDef): string {
  return `'${def.family}','Hind Siliguri','Noto Sans Bengali','Noto Sans',system-ui,sans-serif`;
}

export function posterCss(r: ResolvedPoster, fontUrl: PosterCanvasProps["fontUrl"]): string {
  const head = getFont(r.headlineFont);
  const body = getFont(r.bodyFont);
  const faces = buildFontFaceCss(
    [
      { id: head.id, weights: [head.defaultWeight, ...head.weights] },
      { id: body.id, weights: body.weights },
    ],
    fontUrl,
  );
  const p = r.palette;
  return `${faces}
.pp-root{position:relative;width:${W}px;height:${H}px;overflow:hidden;isolation:isolate;background:${p.bgTo};color:${p.ink};font-family:${familyStack(body)};-webkit-font-smoothing:antialiased;font-kerning:normal;font-feature-settings:"kern" 1,"liga" 1,"clig" 1;text-size-adjust:none;-webkit-text-size-adjust:none}
.pp-root *,.pp-root *::before,.pp-root *::after{box-sizing:border-box;margin:0;padding:0}
.pp-root img{display:block;max-width:none;border:0}
.pp-layer{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
.pp-layer>svg{display:block;width:${W}px;height:${H}px;overflow:visible}
.pp-slot{position:absolute;display:flex;pointer-events:none}
.pp-fit{width:100%;font-family:${familyStack(body)};word-break:normal;overflow-wrap:break-word;text-wrap:balance}
.pp-head{font-family:${familyStack(head)}}
.pp-stack{display:grid;width:100%}
.pp-stack>span{grid-area:1/1;display:block;width:100%}
.pp-photo{position:absolute}
.pp-frame{position:absolute;inset:0;overflow:hidden}
.pp-frame img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}
.pp-cap{position:absolute;left:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;transform:translateX(-50%)}
.pp-cap-name,.pp-cap-sub{display:block;width:100%;white-space:nowrap;overflow:visible}
.pp-line{display:block;width:100%;white-space:nowrap}
.pp-tab{position:absolute;display:flex;align-items:center;justify-content:center}
.pp-tab>span{display:block;width:100%;white-space:nowrap;text-align:center}
`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Small building blocks
 * ──────────────────────────────────────────────────────────────────────────── */

const paletteColor = (p: Palette, c: string | undefined, fallback: string): string => {
  if (!c) return fallback;
  return (p as unknown as Record<string, string>)[c] ?? c;
};

function FitText({
  slot,
  r,
  children,
  fontRole,
  color,
  extra,
  weight,
  scale = 1,
  nowrap,
  constrainHeight,
}: {
  slot: TextSlot;
  r: ResolvedPoster;
  children: ReactNode;
  fontRole?: "headline" | "body";
  color?: string;
  extra?: CSSProperties;
  weight?: number;
  scale?: number;
  nowrap?: boolean;
  constrainHeight?: boolean;
}): ReactNode {
  const role = fontRole ?? slot.font ?? "body";
  const valign = slot.valign ?? "middle";
  const style: CSSProperties = {
    left: slot.x,
    top: slot.y,
    width: slot.w,
    height: slot.h,
    alignItems: valign === "top" ? "flex-start" : valign === "bottom" ? "flex-end" : "center",
    transform: slot.rotate ? `rotate(${slot.rotate}deg)` : undefined,
  };
  const textStyle: CSSProperties = {
    fontSize: slot.size * scale,
    lineHeight: slot.lineHeight ?? 1.25,
    fontWeight: weight ?? slot.weight ?? 600,
    textAlign: slot.align ?? "center",
    color: color ?? paletteColor(r.palette, slot.color as string | undefined, r.palette.ink),
    whiteSpace: nowrap || slot.nowrap ? "nowrap" : "normal",
    letterSpacing: slot.letterSpacing ? `${slot.letterSpacing}em` : undefined,
    ...extra,
  };
  const head = getFont(r.headlineFont);
  return (
    <div className="pp-slot" style={style}>
      <div
        className={role === "headline" ? "pp-fit pp-head" : "pp-fit"}
        data-fit="1"
        data-max={slot.size}
        data-min={slot.minSize ?? Math.max(14, Math.round(slot.size * 0.45))}
        data-scale={scale}
        data-h={constrainHeight === false || nowrap || slot.nowrap ? 0 : slot.h}
        style={{ ...textStyle, fontFamily: role === "headline" ? familyStack(head) : undefined }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Headline with layered effects (outline / extrusion / gradient fill).
 * All effect sizes are in `em`, so they scale with the font size the fitter settles on.
 * Layers share one grid cell; explicit z-index keeps the fill on top even when a lower layer is transformed.
 */
function Headline({ r, text }: { r: ResolvedPoster; text: string }): ReactNode {
  const slot = r.layout.slots.headline;
  const p = r.palette;
  const head = getFont(r.headlineFont);
  const style: HeadlineStyle = r.headlineStyle;
  const size = slot.size;

  // shared by every layer; font-size / line-height are inherited from the fitted container
  const base: CSSProperties = {
    position: "relative",
    fontWeight: head.defaultWeight,
    textAlign: slot.align ?? "center",
    whiteSpace: "pre-line",
  };

  const layers: ReactNode[] = [];
  // extrusion colour: a deeper shade of the outline — or of the fill when the outline is light
  const shade = luminance(p.headlineStroke) > 0.55 ? darken(p.headline, 0.5) : darken(p.headlineStroke, 0.18);
  const outline = (color: string, em: number, z: number, dy = 0): ReactNode => (
    <span
      key={`o${z}`}
      style={{
        ...base,
        zIndex: z,
        color,
        WebkitTextStroke: `${em}em ${color}`,
        transform: dy ? `translateY(${dy}em)` : undefined,
      }}
    >
      {text}
    </span>
  );

  if (style === "stroke") {
    layers.push(
      outline(shade, 0.17, 0, 0.055),
      outline(p.headlineStroke, 0.17, 1),
      <span key="fi" style={{ ...base, zIndex: 2, color: p.headline }}>
        {text}
      </span>,
    );
  } else if (style === "gradient") {
    const hi = lighten(p.headline, 0.55);
    const lo = darken(p.headline, 0.3);
    layers.push(
      outline(shade, 0.15, 0, 0.05),
      outline(p.headlineStroke, 0.15, 1),
      <span
        key="fi"
        style={{
          ...base,
          zIndex: 2,
          color: "transparent",
          backgroundImage: `linear-gradient(180deg, ${hi} 0%, ${p.headline} 46%, ${lo} 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
        }}
      >
        {text}
      </span>,
    );
  } else if (style === "shadow") {
    layers.push(
      <span
        key="fi"
        style={{
          ...base,
          color: p.headline,
          textShadow: `0 0.045em 0 ${alpha(p.headlineStroke, 0.92)}, 0 0.11em 0.2em rgba(0,0,0,0.38)`,
        }}
      >
        {text}
      </span>,
    );
  } else if (style === "emboss") {
    layers.push(
      <span
        key="fi"
        style={{
          ...base,
          color: p.headline,
          textShadow: `0 -0.012em 0 ${lighten(p.headline, 0.5)}, 0 0.03em 0 ${p.headlineStroke}, 0 0.09em 0.16em rgba(0,0,0,0.42)`,
        }}
      >
        {text}
      </span>,
    );
  } else {
    layers.push(
      <span key="fi" style={{ ...base, color: p.headline }}>
        {text}
      </span>,
    );
  }

  const valign = slot.valign ?? "middle";
  return (
    <div
      className="pp-slot"
      style={{
        left: slot.x,
        top: slot.y,
        width: slot.w,
        height: slot.h,
        alignItems: valign === "top" ? "flex-start" : valign === "bottom" ? "flex-end" : "center",
        transform: slot.rotate ? `rotate(${slot.rotate}deg)` : undefined,
      }}
    >
      <div
        className="pp-fit pp-head pp-stack"
        data-fit="1"
        data-max={size}
        data-min={slot.minSize ?? 48}
        data-scale={r.headlineScale}
        data-h={Math.round(slot.h * 0.93)}
        style={{ fontSize: size * r.headlineScale, lineHeight: slot.lineHeight ?? 1.12, fontFamily: familyStack(head) }}
      >
        {layers}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Photos
 * ──────────────────────────────────────────────────────────────────────────── */

function photoFilterCss(f: ResolvedPoster["photoFilter"]): string {
  switch (f) {
    case "bw":
      return "grayscale(1) contrast(1.1) brightness(1.02)";
    case "warm":
      return "sepia(0.2) saturate(1.1) contrast(1.05)";
    case "punch":
      return "contrast(1.12) saturate(1.22)";
    default:
      return "contrast(1.04) saturate(1.05)";
  }
}

const HEX_CLIP = "polygon(50% 0%,100% 24%,100% 76%,50% 100%,0% 76%,0% 24%)";

function frameRadius(frame: RealFrame, slot: PhotoSlot): string | undefined {
  switch (frame) {
    case "arch":
      return `${slot.w / 2}px ${slot.w / 2}px 26px 26px`;
    case "circle":
      return "50%";
    case "rounded":
      return "34px";
    default:
      return undefined;
  }
}

function PhotoNode({
  slot,
  photo,
  index,
  r,
  placeholders,
}: {
  slot: PhotoSlot;
  photo?: PosterPhoto;
  index: number;
  r: ResolvedPoster;
  placeholders?: boolean;
}): ReactNode {
  const p = r.palette;
  const frame = slot.frame ?? r.frame;
  const cutout = !!photo?.alpha;
  if (!photo && !placeholders) return null;

  const focus = photo?.focus;
  const fx = focus ? focus.x * 100 : 50;
  const fy = focus ? focus.y * 100 : 32;
  const zoom = focus?.zoom ?? 1;
  const src = photo?.src ?? avatarDataUri(index, p);
  const ghost = !photo;

  const imgStyle: CSSProperties = {
    objectPosition: `${fx}% ${fy}%`,
    transformOrigin: `${fx}% ${fy}%`,
    transform: zoom > 1 ? `scale(${zoom})` : undefined,
    filter: ghost ? "none" : photoFilterCss(r.photoFilter),
    opacity: ghost ? 0.9 : 1,
  };

  const wrapStyle: CSSProperties = {
    left: slot.x,
    top: slot.y,
    width: slot.w,
    height: slot.h,
    zIndex: slot.z ?? 1,
    transform: slot.rotate ? `rotate(${slot.rotate}deg)` : undefined,
  };

  const ring = `0 0 0 6px ${p.accent}, 0 0 0 13px ${p.paper}, 0 26px 50px rgba(0,0,0,0.42)`;
  let body: ReactNode;

  if (cutout) {
    body = (
      <div className="pp-frame" style={{ overflow: "visible" }}>
        <img
          src={src}
          alt=""
          style={{ ...imgStyle, objectFit: "contain", objectPosition: "50% 100%", filter: `${imgStyle.filter} drop-shadow(0 18px 26px rgba(0,0,0,0.5))` }}
        />
      </div>
    );
  } else if (frame === "hex") {
    body = (
      <>
        <div style={{ position: "absolute", inset: 0, clipPath: HEX_CLIP, background: p.accent, filter: "drop-shadow(0 22px 26px rgba(0,0,0,0.45))" }} />
        <div style={{ position: "absolute", inset: 9, clipPath: HEX_CLIP, background: p.paper }} />
        <div className="pp-frame" style={{ inset: 20, clipPath: HEX_CLIP }}>
          <img src={src} alt="" style={imgStyle} />
        </div>
      </>
    );
  } else if (frame === "fade") {
    body = (
      <div
        className="pp-frame"
        style={{
          overflow: "visible",
          WebkitMaskImage: "linear-gradient(180deg,#000 0%,#000 58%,transparent 100%),linear-gradient(90deg,transparent 0%,#000 14%,#000 86%,transparent 100%)",
          maskImage: "linear-gradient(180deg,#000 0%,#000 58%,transparent 100%),linear-gradient(90deg,transparent 0%,#000 14%,#000 86%,transparent 100%)",
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      >
        <img src={src} alt="" style={imgStyle} />
      </div>
    );
  } else if (frame === "polaroid") {
    body = (
      <div style={{ position: "absolute", inset: 0, background: "#fffdf6", padding: "16px 16px 100px", boxShadow: "0 22px 44px rgba(0,0,0,0.38)" }}>
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#ddd" }}>
          <img src={src} alt="" style={{ ...imgStyle, position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </div>
    );
  } else {
    body = (
      <div className="pp-frame" style={{ borderRadius: frameRadius(frame, slot), boxShadow: ring, background: mix(p.bgFrom, "#000", 0.3) }}>
        <img src={src} alt="" style={imgStyle} />
      </div>
    );
  }

  const hasCaption = !ghost && !slot.noCaption && !!(photo?.caption || photo?.subcaption);
  return (
    <div className="pp-photo" style={wrapStyle}>
      {body}
      {ghost && placeholders ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 26,
            transform: "translateX(-50%)",
            padding: "8px 20px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: 24,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          ছবি যোগ করুন
        </div>
      ) : null}
      {hasCaption ? <Caption photo={photo!} slot={slot} r={r} /> : null}
    </div>
  );
}

function Caption({ photo, slot, r }: { photo: PosterPhoto; slot: PhotoSlot; r: ResolvedPoster }): ReactNode {
  const p = r.palette;
  const polaroid = (slot.frame ?? r.frame) === "polaroid";
  const w = polaroid ? slot.w - 40 : Math.min(slot.w * 1.02, slot.w + 40);
  const hasSub = !!photo.subcaption;
  const h = polaroid ? 84 : hasSub ? 98 : 62;
  const top = polaroid ? slot.h - 94 : slot.h - 22;
  const bg = polaroid ? "transparent" : p.panel;
  const fg = polaroid ? "#2a2a2a" : p.panelText;
  const sub = polaroid ? "#555" : alpha(p.panelText, 0.82);
  return (
    <div
      className="pp-cap"
      style={{
        top,
        width: w,
        height: h,
        background: bg,
        borderRadius: 14,
        border: polaroid ? "none" : `2.5px solid ${p.accent}`,
        boxShadow: polaroid ? "none" : "0 12px 24px rgba(0,0,0,0.35)",
        padding: "6px 14px",
        gap: 2,
      }}
    >
      {photo.caption ? (
        <div
          className="pp-cap-name"
          data-fit="1"
          data-max={hasSub ? 40 : 36}
          data-min={16}
          data-h={0}
          style={{ fontSize: hasSub ? 40 : 36, lineHeight: 1.3, fontWeight: 700, color: fg, textAlign: "center" }}
        >
          {photo.caption}
        </div>
      ) : null}
      {photo.subcaption ? (
        <div className="pp-cap-sub" data-fit="1" data-max={26} data-min={13} data-h={0} style={{ fontSize: 26, lineHeight: 1.25, fontWeight: 500, color: sub, textAlign: "center" }}>
          {photo.subcaption}
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Name plate (name / designation / party) + credit tab + footer location + date
 * ──────────────────────────────────────────────────────────────────────────── */

function PlateStack({ slot, r }: { slot: PlateSlot; r: ResolvedPoster }): ReactNode {
  const c = r.content;
  const p = r.palette;
  const align = slot.align ?? "center";
  // whatever the (possibly AI-chosen) palette is, keep these readable on the plate surface
  const safe = (c: string) => (c.startsWith("#") ? ensureContrast(c, p.panel, 3.8) : c);
  const nameColor = safe(paletteColor(p, slot.nameColor as string | undefined, p.panelText));
  const subColor = paletteColor(p, slot.subColor as string | undefined, alpha(p.panelText, 0.86));
  const desColor = safe(paletteColor(p, slot.designationColor as string | undefined, p.accent));
  const head = getFont(r.headlineFont);
  const lines: ReactNode[] = [];
  if (c.name) {
    lines.push(
      <div
        key="n"
        className="pp-line pp-head"
        data-fit="1"
        data-max={slot.nameSize}
        data-min={26}
        data-h={0}
        style={{ fontSize: slot.nameSize, lineHeight: 1.3, fontWeight: head.defaultWeight, textAlign: align, color: nameColor, fontFamily: familyStack(head) }}
      >
        {c.name}
      </div>,
    );
  }
  if (c.designation) {
    lines.push(
      <div
        key="d"
        className="pp-line"
        data-fit="1"
        data-max={slot.designationSize}
        data-min={20}
        data-h={0}
        style={{ fontSize: slot.designationSize, lineHeight: 1.3, fontWeight: 700, textAlign: align, color: desColor }}
      >
        {c.designation}
      </div>,
    );
  }
  if (c.party) {
    lines.push(
      <div
        key="p"
        className="pp-line"
        data-fit="1"
        data-max={slot.partySize}
        data-min={18}
        data-h={0}
        style={{ fontSize: slot.partySize, lineHeight: 1.3, fontWeight: 600, textAlign: align, color: subColor }}
      >
        {c.party}
      </div>,
    );
  }
  return (
    <div
      className="pp-slot"
      style={{
        left: slot.x,
        top: slot.y,
        width: slot.w,
        height: slot.h,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "stretch",
        gap: slot.gap ?? 4,
      }}
    >
      {lines}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The poster
 * ──────────────────────────────────────────────────────────────────────────── */

export function PosterCanvas({ resolved: r, fontUrl, uid = "pp", placeholders }: PosterCanvasProps): ReactNode {
  const theme = getTheme(r.layout.themeId);
  const c = r.content;
  const s = r.layout.slots;
  const location = joinParts([c.union, c.thana, c.district]);
  const tc = theme.textColors?.(r.palette) ?? {};

  // The decorative layers are the expensive part (hundreds of SVG nodes). They only depend on the palette, motifs,
  // seed, layout and which optional texts exist — never on the text itself — so memoise them. While someone types
  // in the studio, React then skips these subtrees entirely.
  const flags = `${c.dateText ? 1 : 0}${c.subheadline ? 1 : 0}${c.creditLabel ? 1 : 0}`;
  const key = [uid, Object.values(r.palette).join(), r.motifs.join(), r.seed, r.photoCount, JSON.stringify(r.slots), flags].join("|");
  const layers = useMemo(() => {
    const motifs = new Set(r.motifs);
    const ctx: ThemeCtx = { uid, W, H, r, p: r.palette, has: (m) => motifs.has(m) };
    return { back: theme.Back(ctx), mid: theme.Mid?.(ctx), plate: theme.Plate(ctx), front: theme.Front?.(ctx) };
  }, [key, r.layout]);

  const slots = r.slots
    .map((slot, i) => ({ slot, i, photo: c.photos[i] }))
    .sort((a, b) => (a.slot.z ?? 1) - (b.slot.z ?? 1));

  return (
    <div
      className="pp-root"
      data-poster="1"
      data-theme={r.layout.themeId}
      style={{ ["--pp-primary" as string]: r.palette.primary, ["--pp-accent" as string]: r.palette.accent }}
    >
      <style>{posterCss(r, fontUrl)}</style>

      <div className="pp-layer">{layers.back}</div>
      {r.backdropUrl ? (
        <div className="pp-layer" style={{ opacity: 0.55, mixBlendMode: "soft-light" }}>
          <img src={r.backdropUrl} alt="" style={{ width: W, height: H, objectFit: "cover" }} />
        </div>
      ) : null}

      <div className="pp-layer" style={{ pointerEvents: "none" }}>
        {slots.map(({ slot, i, photo }) => (
          <PhotoNode key={i} slot={slot} photo={photo} index={i} r={r} placeholders={placeholders} />
        ))}
      </div>

      {layers.mid ? <div className="pp-layer">{layers.mid}</div> : null}
      <div className="pp-layer">{layers.plate}</div>

      {/* text */}
      {c.dateText && s.dateText ? (
        <FitText slot={s.dateText} r={r} nowrap color={tc.date ?? r.palette.paper} weight={700}>
          {c.dateText}
        </FitText>
      ) : null}
      <Headline r={r} text={c.headline} />
      {c.subheadline && s.subheadline ? (
        <FitText slot={s.subheadline} r={r} color={tc.sub ?? r.palette.paper} weight={600}>
          {c.subheadline}
        </FitText>
      ) : null}
      <PlateStack slot={s.plate} r={r} />
      {c.creditLabel && s.creditLabel ? (
        <FitText slot={s.creditLabel} r={r} nowrap color={tc.credit ?? r.palette.ink} weight={700}>
          {c.creditLabel}
        </FitText>
      ) : null}
      {location && s.location ? (
        <FitText slot={s.location} r={r} nowrap color={tc.footer ?? r.palette.footerText} weight={600}>
          {location}
        </FitText>
      ) : null}

      {layers.front ? <div className="pp-layer">{layers.front}</div> : null}
    </div>
  );
}
