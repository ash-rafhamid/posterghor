import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { banglaRatio, cleanText, formatBanglaDate, graphemeLength, joinParts, toBanglaDigits, toLatinDigits } from "../bangla";

describe("Bangla helpers", () => {
  it("converts digits both ways", () => {
    assert.equal(toBanglaDigits(2026), "২০২৬");
    assert.equal(toBanglaDigits("16 Dec"), "১৬ Dec");
    assert.equal(toLatinDigits("০১৭১২৩৪৫৬৭৮"), "01712345678");
  });

  it("cleanText strips control characters and collapses whitespace", () => {
    assert.equal(cleanText("  মহান   বিজয়\t দিবস \u0007 "), "মহান বিজয় দিবস");
    assert.equal(cleanText("a\r\n\r\n\r\n\r\nb"), "a\n\nb");
    assert.equal(cleanText("line one  \n   line two"), "line one\nline two");
    assert.equal(cleanText(null), "");
    assert.equal(cleanText(undefined), "");
  });

  it("cleanText keeps the joiners that Bangla conjunct shaping depends on", () => {
    const rya = "র‍্যা"; // র + ZWJ + ্ + যা  (the ‘র‍্যা’ in র‍্যাব / ব্যারিস্টার-style forms)
    assert.equal(cleanText(rya), rya);
    const zwnj = "ক‌্ষ";
    assert.equal(cleanText(zwnj), zwnj);
  });

  it("cleanText removes invisible separators that could break layout", () => {
    assert.equal(cleanText("a b c﻿d"), "abcd");
  });

  it("measures Bangla by visible clusters, not code points", () => {
    assert.equal(graphemeLength("বিজয়"), 3); // বি · জ · য়
    assert.equal(graphemeLength(""), 0);
    assert.equal(graphemeLength("abc"), 3);
  });

  it("detects the share of Bengali letters", () => {
    assert.equal(banglaRatio("মহান"), 1);
    assert.equal(banglaRatio("Victory"), 0);
    assert.equal(banglaRatio("১২৩ !"), 0); // digits and punctuation are not letters
    const mixed = banglaRatio("Day বিজয়");
    assert.ok(mixed > 0.3 && mixed < 0.9, `mixed ratio ${mixed}`);
  });

  it("joins address parts and formats Bangla dates", () => {
    assert.equal(joinParts(["৫নং ইউনিয়ন", "", undefined, "সদর থানা"]), "৫নং ইউনিয়ন, সদর থানা");
    assert.equal(joinParts([" ", null]), "");
    assert.equal(formatBanglaDate(new Date(2026, 11, 16)), "১৬ ডিসেম্বর ২০২৬");
    assert.equal(formatBanglaDate(new Date(2026, 2, 26)), "২৬ মার্চ ২০২৬");
  });
});
