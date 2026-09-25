import { cleanText, getOccasion, type OccasionId } from "@poster/shared";
import { logger } from "../../lib/logger";
import { cacheGet, cacheSet } from "./cache";
import { generateJson, geminiEnabled } from "./gemini";
import { SUGGEST_SCHEMA, SUGGEST_SYSTEM } from "./prompts";

export interface TextSuggestions {
  headlines: string[];
  subheadlines: string[];
  source: "gemini" | "curated";
}

/**
 * Bangla headline ideas for the studio's "Suggest with AI" button.
 * Cached per occasion + tone (no personal data is ever sent), curated fallback when Gemini is off.
 */
export async function suggestText(occasionId: OccasionId, tone?: string): Promise<TextSuggestions> {
  const occasion = getOccasion(occasionId);
  const curated: TextSuggestions = { headlines: occasion.headlines, subheadlines: occasion.subheadlines, source: "curated" };
  if (!geminiEnabled()) return curated;

  const key = `suggest:v1:${occasion.id}:${tone ?? occasion.tone}`;
  // A little variety: rotate through up to 3 cached batches per occasion/tone.
  const slot = Math.floor(Math.random() * 3);
  const cached = await cacheGet<TextSuggestions>(`${key}:${slot}`);
  if (cached) return cached;

  try {
    const res = await generateJson({
      system: SUGGEST_SYSTEM,
      parts: [
        {
          text: `Occasion: ${occasion.en} (${occasion.bn}). Tone: ${tone ?? occasion.tone}. Batch #${slot + 1} — give a different set from other batches.`,
        },
      ],
      schema: SUGGEST_SCHEMA,
      temperature: 1,
      maxOutputTokens: 900,
    });
    const data = res.data as { headlines?: string[]; subheadlines?: string[] };
    const clean = (list: string[] | undefined, max: number) =>
      (list ?? []).map((s) => cleanText(s)).filter((s) => s.length >= 2 && s.length <= max).slice(0, 8);
    const out: TextSuggestions = { headlines: clean(data.headlines, 60), subheadlines: clean(data.subheadlines, 110), source: "gemini" };
    if (!out.headlines.length) return curated;
    await cacheSet("suggest", `${key}:${slot}`, out, { model: res.model, tokens: res.usage.total });
    return out;
  } catch (e) {
    logger.warn({ err: e }, "text suggestions failed — serving curated list");
    return curated;
  }
}
