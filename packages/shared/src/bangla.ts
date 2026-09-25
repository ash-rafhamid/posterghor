/**
 * Small helpers for working with Bangla (Bengali) text.
 * Everything here is isomorphic (runs in the browser and in Node).
 */

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/** 2026 -> ২০২৬ */
export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/** ২০২৬ -> 2026 */
export function toLatinDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d as (typeof BN_DIGITS)[number])));
}

/** Share (0..1) of letters in the string that are Bengali script. */
export function banglaRatio(text: string): number {
  const letters = text.replace(/[\s\p{N}\p{P}\p{S}]/gu, "");
  if (!letters.length) return 0;
  const bn = letters.match(/[ঀ-৿]/g)?.length ?? 0;
  return bn / letters.length;
}

export function hasBangla(text: string): boolean {
  return /[ঀ-৿]/.test(text);
}

// Control chars (except \n, \t), DEL + C1 controls, line/paragraph separators and the BOM.
// ZWJ / ZWNJ are deliberately kept: Bangla conjunct shaping depends on them.
// Built at runtime so invisible separator characters never appear literally in this source file.
const STRIP_RE = new RegExp(
  "[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F-\\x9F" + String.fromCharCode(0x2028, 0x2029, 0xfeff) + "]",
  "g",
);
const SPACE_RE = new RegExp("[ \\t" + String.fromCharCode(0xa0) + "]+", "g");

/**
 * Cleans user-provided poster text:
 *  - removes control characters (keeps ZWJ / ZWNJ, which Bangla shaping needs)
 *  - collapses runs of spaces / tabs, trims every line
 *  - keeps deliberate line breaks (3+ in a row → 1 blank line)
 */
export function cleanText(input: string | undefined | null): string {
  if (!input) return "";
  return String(input)
    .replace(/\r\n?/g, "\n")
    .replace(STRIP_RE, "")
    .replace(SPACE_RE, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Visible character count: counts a Bangla conjunct / vowel-sign cluster as one. */
export function graphemeLength(text: string): number {
  if (!text) return 0;
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => { segment(s: string): Iterable<unknown> } })
    .Segmenter;
  if (Seg) {
    let n = 0;
    for (const _ of new Seg("bn", { granularity: "grapheme" }).segment(text)) {
      void _;
      n++;
    }
    return n;
  }
  return [...text].length;
}

/** Join non-empty parts with a separator (used for "union, thana, district"). */
export function joinParts(parts: Array<string | undefined | null>, sep = ", "): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(sep);
}

/** Bangla month names (Gregorian) for date helpers. */
export const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
] as const;

/** Formats a Date as "১৬ ডিসেম্বর ২০২৬". */
export function formatBanglaDate(d: Date): string {
  return `${toBanglaDigits(d.getDate())} ${BN_MONTHS[d.getMonth()]} ${toBanglaDigits(d.getFullYear())}`;
}
