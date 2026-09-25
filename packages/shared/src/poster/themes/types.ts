import type { ReactNode } from "react";
import type { Palette, ResolvedPoster, ThemeId } from "../types";

export interface ThemeCtx {
  /** unique id prefix so SVG gradient / filter ids never collide when several posters share a page */
  uid: string;
  W: number;
  H: number;
  r: ResolvedPoster;
  p: Palette;
  /** is this decorative motif switched on? */
  has: (motif: string) => boolean;
}

/** Colours for the small text elements that sit on theme-specific shapes (ribbon, pill, tab, footer). */
export interface ThemeTextColors {
  date?: string;
  sub?: string;
  credit?: string;
  footer?: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  /** Every motif this theme knows how to draw (the AI may pick a subset) */
  motifPool: string[];
  /** Background + far decoration — behind the photos */
  Back: (c: ThemeCtx) => ReactNode;
  /** Decoration between the photos and the text (doves, ribbons …) */
  Mid?: (c: ThemeCtx) => ReactNode;
  /** Name-plate, subheadline ribbon and footer bar shapes — drawn under the text */
  Plate: (c: ThemeCtx) => ReactNode;
  /** Final overlay: frame, vignette, grain */
  Front?: (c: ThemeCtx) => ReactNode;
  textColors?: (p: Palette) => ThemeTextColors;
}
