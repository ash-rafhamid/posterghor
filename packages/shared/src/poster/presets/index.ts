import type { OccasionId } from "../../constants";
import type { LayoutConfig } from "../types";
import { BOISHAKH_LAYOUT } from "./boishakh";
import { CAMPAIGN_LAYOUT } from "./campaign";
import { EID_LAYOUT } from "./eid";
import { SUNRISE_LAYOUT } from "./sunrise";
import { TRIBUTE_LAYOUT } from "./tribute";
import { VICTORY_LAYOUT } from "./victory";

export interface TemplatePreset {
  slug: string;
  title: string;
  titleBn: string;
  description: string;
  occasionType: OccasionId;
  sortOrder: number;
  layoutConfig: LayoutConfig;
}

/** The six seed templates (loaded into MongoDB by `npm run seed`). */
export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    slug: "bijoy-gourab",
    title: "Victory Glory",
    titleBn: "বিজয় গৌরব",
    description: "Flag-red sun over golden paddy fields, doves in flight — the classic Victory Day poster.",
    occasionType: "victory",
    sortOrder: 1,
    layoutConfig: VICTORY_LAYOUT,
  },
  {
    slug: "nirob-shraddha",
    title: "Silent Respect",
    titleBn: "নীরব শ্রদ্ধা",
    description: "A dignified memorial: soft light on a black-and-white portrait, shapla lilies and candle glow.",
    occasionType: "tribute",
    sortOrder: 2,
    layoutConfig: TRIBUTE_LAYOUT,
  },
  {
    slug: "jonotar-konthosshor",
    title: "Voice of the People",
    titleBn: "জনতার কণ্ঠ",
    description: "Rally energy: a two-colour diagonal split, sun-ray burst and a bold yellow headline band.",
    occasionType: "campaign",
    sortOrder: 3,
    layoutConfig: CAMPAIGN_LAYOUT,
  },
  {
    slug: "notun-shokal",
    title: "New Morning",
    titleBn: "নতুন সকাল",
    description: "A modern sunrise campaign look — round portraits, halftone dots and village silhouettes.",
    occasionType: "campaign",
    sortOrder: 4,
    layoutConfig: SUNRISE_LAYOUT,
  },
  {
    slug: "shuvo-noboborsho",
    title: "Joyful Wishes",
    titleBn: "শুভেচ্ছা বার্তা",
    description: "Pohela Boishakh spirit — alpona folk art, marigolds and scrapbook polaroids on cream paper.",
    occasionType: "greeting",
    sortOrder: 5,
    layoutConfig: BOISHAKH_LAYOUT,
  },
  {
    slug: "eid-mubarak",
    title: "Eid Night",
    titleBn: "ঈদের রাত",
    description: "Golden crescent, hanging lanterns and a glowing mosque skyline for Eid greetings.",
    occasionType: "festival",
    sortOrder: 6,
    layoutConfig: EID_LAYOUT,
  },
];

export { VICTORY_LAYOUT, TRIBUTE_LAYOUT, CAMPAIGN_LAYOUT, SUNRISE_LAYOUT, BOISHAKH_LAYOUT, EID_LAYOUT };
export { demoContent } from "./demo";
