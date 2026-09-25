import type { PosterFormData } from "@poster/shared";

/**
 * First-line content moderation for poster text.
 *
 * Political posters are exactly the kind of content that gets abused (threats, hate, harassment), so every text
 * field is screened before generation:
 *   • "block"  — clear incitement / abuse: the request is refused with an explanation;
 *   • "review" — sensitive but sometimes legitimate (protest slogans etc.): generated, but placed in the admin queue.
 * This is deliberately a small, transparent starter list (Bangla + English) — extend it, or plug in a
 * classifier, in `PATTERNS`. Photo-level checks (explicit / violence / hate symbols) happen in the Gemini step.
 */

interface Rule {
  re: RegExp;
  reason: string;
}

// (?![ঀ-৿]) = "not followed by another Bengali letter" — so "হত্যা করুন" (kill!) matches but the
// harmless past-tense "হত্যা করা হয়েছে" (…was killed) does not.
const NB = "(?![\\u0980-\\u09FF])";
const BLOCK: Rule[] = [
  {
    re: new RegExp(`(হত্যা|খুন|মেরে\\s*ফেল|জবাই|কুপিয়ে)\\s*(করো|করুন|করবো|করব|কর\\s*দাও|কর)${NB}`, "u"),
    reason: "Incitement to violence",
  },
  { re: /\b(kill|murder|lynch|slaughter)\s+(him|her|them|all|every)/i, reason: "Incitement to violence" },
  { re: /(মালাউন|নেড়ে|কাফের\s*(মার|হত্যা)|বিহারি\s*কুত্তা)/u, reason: "Hate speech / slur" },
  { re: /(বেশ্যা|খানকি|মাগি|হারামজাদা|শুয়োর\s*কা?\s*বাচ্চা)/u, reason: "Abusive language" },
  { re: /\b(f+u+c+k|c+u+n+t|n[i1]gg(er|a)|whore|bitch)\b/i, reason: "Abusive language" },
  { re: new RegExp(`(ধর্ষণ)\\s*(করো|করুন|কর)${NB}|\\brape\\s+(them|her|him)\\b`, "iu"), reason: "Sexual violence" },
];

const REVIEW: Rule[] = [
  { re: /(ফাঁসি|ফাঁসির)\s*(চাই|দাও|দিতে হবে)/u, reason: "Calls for execution (protest slogan), needs review" },
  { re: /(গণধোলাই|গণপিটুনি|ঘেরাও|অবরোধ\s*চাই)/u, reason: "Mentions mob action / blockade, needs review" },
  { re: /(দালাল|রাজাকার|গাদ্দার|বেইমান|দেশদ্রোহী)/u, reason: "Political name-calling, needs review" },
  { re: /(নিষিদ্ধ\s*কর|ban\s+(the\s+)?party)/iu, reason: "Calls to ban a group, needs review" },
  // whole words only — not the "গুলি" inside "এগুলি" (these) or the "gun" inside "begun"
  { re: /(?<![ঀ-৿])(অস্ত্র|বোমা|গুলি)|\b(bombs?|guns?|weapons?)\b/iu, reason: "Weapon reference, needs review" },
];

export interface ModerationVerdict {
  status: "clean" | "flagged" | "blocked";
  reasons: string[];
}

export function moderateText(form: Partial<PosterFormData>): ModerationVerdict {
  const text = [form.headline, form.subheadline, form.name, form.designation, form.party, form.union, form.thana, form.district, form.dateText, ...(form.photos ?? []).flatMap((p) => [p.caption, p.subcaption])]
    .filter(Boolean)
    .join("\n");
  if (!text) return { status: "clean", reasons: [] };

  const blocked = [...new Set(BLOCK.filter((r) => r.re.test(text)).map((r) => r.reason))];
  if (blocked.length) return { status: "blocked", reasons: blocked };
  const flagged = [...new Set(REVIEW.filter((r) => r.re.test(text)).map((r) => r.reason))];
  return { status: flagged.length ? "flagged" : "clean", reasons: flagged };
}

const PHOTO_FLAG_TEXT: Record<string, string> = {
  explicit: "A photo may contain explicit content",
  graphic_violence: "A photo may show graphic violence",
  hate_symbol: "A photo may contain a hate symbol",
};

export function describePhotoFlags(flags: string[]): string[] {
  return flags.map((f) => PHOTO_FLAG_TEXT[f] ?? `Photo flagged: ${f}`);
}
