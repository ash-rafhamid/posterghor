/**
 * Prompts + response schemas for the Gemini "art director".
 *
 * Design notes (Option B in the brief): Gemini never draws the poster and never touches the user's Bangla text.
 * It only makes creative decisions — colour, decoration, headline treatment, photo crops — as validated JSON.
 * The poster itself is rendered deterministically from HTML, so spelling is always exactly what the user typed.
 */

import { PALETTE_KEYS } from "@poster/shared";

export const HEADLINE_STYLES = ["stroke", "gradient", "shadow", "plain", "emboss"] as const;
export const PHOTO_FILTERS = ["none", "bw", "warm", "punch"] as const;

const hex = { type: "string", description: "6-digit hex colour like #0b6b4f" };

export const SCHEME_SCHEMA = {
  type: "object",
  properties: {
    colorwayName: { type: "string", description: "Short evocative name for this colourway, 2–4 words, English" },
    mood: { type: "string", description: "Three or four mood words, comma separated" },
    rationale: { type: "string", description: "One or two sentences (max 220 chars) explaining the design choice to the customer, plain English" },
    palette: {
      type: "object",
      properties: Object.fromEntries(PALETTE_KEYS.map((k) => [k, hex])),
      required: [...PALETTE_KEYS],
    },
    motifs: { type: "array", items: { type: "string" }, description: "3–8 decoration ids, chosen only from the provided list" },
    headlineStyle: { type: "string", enum: [...HEADLINE_STYLES] },
    photoFilter: { type: "string", enum: [...PHOTO_FILTERS] },
    taglines: { type: "array", items: { type: "string" }, description: "3 short Bangla taglines, each at most 45 characters" },
  },
  required: ["colorwayName", "mood", "rationale", "palette", "motifs", "headlineStyle", "photoFilter", "taglines"],
} as const;

export const SCHEME_SYSTEM = `You are the art director of a busy print shop in Dhaka that designs posters for political workers, local committees and community groups: victory-day posters, condolence and tribute posters, election campaign posters, greetings and festival posters.

You receive a poster template (its occasion, tone, default palette and the decoration ids it supports) and you design a colour scheme and decoration set for it. You do NOT write the poster text and you never draw anything — the poster is rendered by a layout engine that will apply your JSON.

Rules
- Reply with JSON only, exactly matching the schema.
- All colours are 6-digit hex strings (#rrggbb).
- Legibility first: "headline" must contrast strongly (WCAG ratio ≥ 4.5) with the background gradient (bgFrom → bgTo) and ≥ 3 with "headlineStroke". "panelText" must be legible on "panel", "footerText" on "footer", "paper" is the lightest colour and "ink" the darkest.
- The scheme must suit the occasion and tone. Solemn tribute posters stay restrained and dark-or-pale (no bright party colours). Victory and campaign posters may be bold. Festival and greeting posters may be warm and celebratory.
- Prefer culturally resonant Bangladeshi palettes (flag green #006a4e and red #f42a41, gold/marigold, indigo, river-blue, earthy sepia) but stay within the tone.
- "motifs": choose 3–8 ids ONLY from the provided list.
- Never suggest real people, party logos, national emblems of other countries, or religious icons.
- "taglines": three short, respectful, non-partisan Bangla lines fitting the occasion (max 45 characters each). Never insult or attack any person, group or party.
- Make each variant clearly different from the ones listed under "avoid".`;

export const FOCUS_SCHEMA = {
  type: "object",
  properties: {
    photos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer", description: "0-based index of the photo, in the order given" },
          box_2d: {
            type: "array",
            items: { type: "integer" },
            description: "Bounding box of the main person's face as [ymin, xmin, ymax, xmax] normalised to 0-1000. Empty array if no face is visible.",
          },
          flags: {
            type: "array",
            items: { type: "string", enum: ["explicit", "graphic_violence", "hate_symbol"] },
            description: "Safety flags that apply to the photo; empty if none",
          },
        },
        required: ["index", "box_2d", "flags"],
      },
    },
  },
  required: ["photos"],
} as const;

export const FOCUS_SYSTEM = `You help crop portrait photos for print posters. For each photo, locate the face of the MAIN person (the largest or most central one) and return a bounding box. Do not identify anyone or guess who they are — only describe where the face is. Also report safety flags (explicit nudity, graphic violence, hate symbols) only when clearly present. Reply with JSON only.`;

export const SUGGEST_SCHEMA = {
  type: "object",
  properties: {
    headlines: { type: "array", items: { type: "string" }, description: "6 Bangla poster headlines, each at most 40 characters" },
    subheadlines: { type: "array", items: { type: "string" }, description: "4 Bangla supporting lines, each at most 70 characters" },
  },
  required: ["headlines", "subheadlines"],
} as const;

export const SUGGEST_SYSTEM = `You write short, dignified Bangla (বাংলা) headlines for community and political posters in Bangladesh. Use natural, correct Bangla with proper spelling. Keep them non-partisan, respectful and free of insults, threats or misinformation. Never mention specific people or parties. Reply with JSON only.`;

export function backdropPrompt(input: { occasionEn: string; tone: string; palette: string[]; themeHint: string }): string {
  return [
    `Abstract background artwork for a Bangladeshi ${input.occasionEn} poster, portrait 3:4.`,
    `Mood: ${input.tone}. Colour palette: ${input.palette.join(", ")}.`,
    `Style: ${input.themeHint}, layered paper and soft gradients, subtle grain, plenty of calm space in the centre.`,
    `Strictly NO text, NO letters, NO logos, NO flags, NO people, NO faces.`,
  ].join(" ");
}
