"use client";

import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { POSTER_HEIGHT, POSTER_WIDTH, PosterCanvas, fitPosterText, fontsReady, type ResolvedPoster } from "@poster/shared";
import { cn } from "@/lib/utils";

const fontUrl = (file: string) => `/fonts/${file}`;

interface Props {
  resolved: ResolvedPoster;
  /** show silhouette placeholders in empty photo slots (studio) */
  placeholders?: boolean;
  className?: string;
  style?: CSSProperties;
  /** fixed CSS width in px (otherwise fills its container) */
  width?: number;
}

/**
 * Renders the *same* poster engine that the server prints from, scaled into its container.
 * The poster is a 1200×1600 CSS-px canvas; we scale it with a transform (layout metrics are unaffected, so the
 * text-fitter gives identical results to the print render).
 */
function PosterPreviewImpl({ resolved, placeholders = false, className, style, width }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const uid = "pp" + useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / POSTER_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Anything that changes text metrics → refit.
  const c = resolved.content;
  const signature = useMemo(
    () =>
      JSON.stringify([
        c.headline,
        c.subheadline,
        c.name,
        c.designation,
        c.party,
        c.union,
        c.thana,
        c.district,
        c.creditLabel,
        c.dateText,
        c.photos.map((p) => [p.caption, p.subcaption]),
        resolved.headlineFont,
        resolved.headlineScale,
        resolved.photoCount,
        resolved.frame,
      ]),
    [c, resolved.headlineFont, resolved.headlineScale, resolved.photoCount, resolved.frame],
  );

  const visible = scale > 0 && mounted;
  useLayoutEffect(() => {
    const root = posterRef.current;
    if (!root || !visible) return;
    let cancelled = false;
    const run = () => {
      if (!cancelled) fitPosterText(root);
    };
    run();
    void fontsReady().then(() => {
      if (cancelled) return;
      run();
      setReady(true);
    });
    // a font that finishes loading later (e.g. after the user picks another headline font) changes the metrics
    document.fonts?.addEventListener?.("loadingdone", run);
    return () => {
      cancelled = true;
      document.fonts?.removeEventListener?.("loadingdone", run);
    };
  }, [signature, visible]);

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={`${c.headline} — ${c.name}`}
      className={cn("poster-stage relative overflow-hidden", className)}
      style={{ aspectRatio: `${POSTER_WIDTH} / ${POSTER_HEIGHT}`, width: width ?? "100%", ...style }}
    >
      {mounted ? (
        <div
          ref={posterRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: POSTER_WIDTH,
            height: POSTER_HEIGHT,
            transform: `scale(${scale || 0.0001})`,
            transformOrigin: "0 0",
            visibility: ready ? "visible" : "hidden",
          }}
        >
          <PosterCanvas resolved={resolved} fontUrl={fontUrl} uid={uid} placeholders={placeholders} />
        </div>
      ) : null}
      {!ready ? <div aria-hidden className="absolute inset-0 animate-pulse bg-butter/60" /> : null}
    </div>
  );
}

export const PosterPreview = memo(PosterPreviewImpl);
