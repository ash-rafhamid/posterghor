import {
  getOccasion,
  resolvePoster,
  type ApiTemplate,
  type FrameStyle,
  type LayoutConfig,
  type OccasionId,
  type PosterContent,
  type PosterPhoto,
  type ResolvedPoster,
  type StyleChoices,
} from "@poster/shared";

/** A template as the studio needs it — the API shape, or a local preset when the API is unreachable. */
export type StudioTemplate = Pick<ApiTemplate, "id" | "slug" | "title" | "titleBn" | "occasionType" | "layoutConfig"> & { thumbnailUrl?: string };

export interface StudioPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
  hasAlpha: boolean;
  lowRes: boolean;
  type: "image/jpeg" | "image/png";
  caption: string;
  subcaption: string;
  uploadedUrl?: string;
  state: "ready" | "uploading" | "error";
}

export interface StudioForm {
  headline: string;
  subheadline: string;
  dateText: string;
  name: string;
  designation: string;
  party: string;
  union: string;
  thana: string;
  district: string;
  creditLabel: string;
  headlineFont: string;
  frame: FrameStyle;
  photoLayout: "auto" | "1" | "2" | "3";
  /** "auto" (Gemini) or a colourway id */
  palette: string;
  useAiBackdrop: boolean;
}

export type TextKey = "headline" | "subheadline" | "dateText" | "creditLabel";
/** Fields the user has edited — switching template only replaces the *untouched* ones with the new defaults. */
export type Touched = Partial<Record<TextKey | "headlineFont", boolean>>;

export function templateDefaults(tpl: StudioTemplate): Pick<StudioForm, TextKey> {
  const d = tpl.layoutConfig.defaults;
  const occ = getOccasion(tpl.occasionType);
  return {
    headline: d.headline,
    subheadline: d.subheadline,
    creditLabel: d.creditLabel || occ.defaultCreditLabel,
    dateText: tpl.occasionType === "victory" ? "১৬ ডিসেম্বর" : "",
  };
}

export function initialForm(tpl: StudioTemplate): StudioForm {
  return {
    ...templateDefaults(tpl),
    name: "",
    designation: "",
    party: "",
    union: "",
    thana: "",
    district: "",
    headlineFont: tpl.layoutConfig.headline.fontId,
    frame: "auto",
    photoLayout: "auto",
    palette: "auto",
    useAiBackdrop: false,
  };
}

/** Everything the live preview draws, in the exact shape the server renders from. */
export function previewContent(form: StudioForm, photos: StudioPhoto[], occasion: OccasionId): PosterContent {
  return {
    occasion,
    headline: form.headline.trim() || "…",
    subheadline: form.subheadline.trim() || undefined,
    name: form.name.trim() || "আপনার নাম",
    designation: form.designation.trim() || undefined,
    party: form.party.trim() || undefined,
    union: form.union.trim() || undefined,
    thana: form.thana.trim() || undefined,
    district: form.district.trim() || undefined,
    creditLabel: form.creditLabel.trim() || undefined,
    dateText: form.dateText.trim() || undefined,
    photos: photos.map<PosterPhoto>((p) => ({
      src: p.previewUrl,
      caption: p.caption.trim() || undefined,
      subcaption: p.subcaption.trim() || undefined,
      alpha: p.hasAlpha,
    })),
  };
}

export function previewResolved(layout: LayoutConfig, form: StudioForm, photos: StudioPhoto[], occasion: OccasionId): ResolvedPoster {
  const colorwayIndex = form.palette === "auto" ? -1 : layout.colorways.findIndex((c) => c.id === form.palette);
  const choices: StyleChoices = { headlineFont: form.headlineFont, frame: form.frame, photoLayout: form.photoLayout };
  return resolvePoster({ layout, content: previewContent(form, photos, occasion), choices, variant: Math.max(0, colorwayIndex) });
}

const DRAFT_KEY = "pg_studio_draft_v1";

export interface Draft {
  slug: string;
  form: StudioForm;
  touched: Touched;
}

export function saveDraft(d: Draft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable — drafts are a convenience only */
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
