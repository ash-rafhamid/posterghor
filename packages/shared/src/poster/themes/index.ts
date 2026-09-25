import type { ThemeId } from "../types";
import type { Theme } from "./types";
import { boishakhTheme } from "./boishakh";
import { campaignTheme } from "./campaign";
import { eidTheme } from "./eid";
import { sunriseTheme } from "./sunrise";
import { tributeTheme } from "./tribute";
import { victoryTheme } from "./victory";

const THEMES: Record<ThemeId, Theme> = {
  victory: victoryTheme,
  tribute: tributeTheme,
  campaign: campaignTheme,
  sunrise: sunriseTheme,
  boishakh: boishakhTheme,
  eid: eidTheme,
};

export function getTheme(id: ThemeId): Theme {
  return THEMES[id] ?? victoryTheme;
}

export function themeMotifPool(id: ThemeId): string[] {
  return getTheme(id).motifPool;
}

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export type { Theme, ThemeCtx } from "./types";
