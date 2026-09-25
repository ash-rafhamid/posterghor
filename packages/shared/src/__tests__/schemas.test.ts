import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bulkPosterSchema, createPosterSchema, loginSchema, parseIdentifier, posterFormSchema, regeneratePosterSchema, registerSchema } from "../schemas";

const okForm = {
  occasion: "victory",
  headline: "মহান বিজয় দিবস",
  name: "মোঃ আবদুর রহমান",
  photos: [{ url: "https://example.com/a.jpg" }],
};

describe("identifiers", () => {
  it("accepts emails and Bangladeshi mobiles in every common spelling", () => {
    assert.deepEqual(parseIdentifier("  Rahim@Example.COM "), { kind: "email", value: "rahim@example.com" });
    assert.deepEqual(parseIdentifier("01712345678"), { kind: "phone", value: "+8801712345678" });
    assert.deepEqual(parseIdentifier("+8801712345678"), { kind: "phone", value: "+8801712345678" });
    assert.deepEqual(parseIdentifier("8801712345678"), { kind: "phone", value: "+8801712345678" });
    assert.deepEqual(parseIdentifier("০১৭১২-৩৪৫৬৭৮"), { kind: "phone", value: "+8801712345678" });
    assert.deepEqual(parseIdentifier("017 1234 5678"), { kind: "phone", value: "+8801712345678" });
  });

  it("rejects nonsense", () => {
    for (const bad of ["", "abc", "12345", "01212345678", "a@b", "rahim@@x.com", "rahim @x.com"]) {
      assert.equal(parseIdentifier(bad), null, JSON.stringify(bad));
    }
  });

  it("auth schemas enforce password length and a valid identifier", () => {
    assert.ok(registerSchema.safeParse({ name: "রহিম", identifier: "01712345678", password: "longenough1" }).success);
    assert.ok(!registerSchema.safeParse({ name: "রহিম", identifier: "01712345678", password: "short" }).success);
    assert.ok(!registerSchema.safeParse({ name: "", identifier: "01712345678", password: "longenough1" }).success);
    assert.ok(!loginSchema.safeParse({ identifier: "nope", password: "x" }).success);
    assert.ok(loginSchema.safeParse({ identifier: "rahim@example.com", password: "x" }).success);
  });
});

describe("poster form", () => {
  it("fills defaults and cleans text", () => {
    const r = posterFormSchema.parse({ ...okForm, name: "  মোঃ   রহমান\u0007 " });
    assert.equal(r.name, "মোঃ রহমান");
    assert.equal(r.subheadline, "");
    assert.equal(r.frame, "auto");
    assert.equal(r.photoLayout, "auto");
    assert.equal(r.palette, "auto");
    assert.equal(r.useAiBackdrop, false);
    assert.equal(r.headlineFont, undefined);
  });

  it("enforces required fields and length limits", () => {
    assert.ok(!posterFormSchema.safeParse({ ...okForm, headline: "" }).success);
    assert.ok(!posterFormSchema.safeParse({ ...okForm, headline: "   " }).success, "whitespace-only headline");
    assert.ok(!posterFormSchema.safeParse({ ...okForm, name: "" }).success);
    assert.ok(!posterFormSchema.safeParse({ ...okForm, headline: "ক".repeat(91) }).success);
    assert.ok(posterFormSchema.safeParse({ ...okForm, headline: "ক".repeat(90) }).success);
    assert.ok(!posterFormSchema.safeParse({ ...okForm, photos: [{ url: "https://x.com/a.jpg", caption: "ক".repeat(61) }] }).success);
  });

  it("limits photos, occasions and fonts to known values", () => {
    const four = Array.from({ length: 4 }, () => ({ url: "https://x.com/a.jpg" }));
    assert.ok(!posterFormSchema.safeParse({ ...okForm, photos: four }).success);
    assert.ok(!posterFormSchema.safeParse({ ...okForm, photos: [{ url: "not a url" }] }).success);
    assert.ok(!posterFormSchema.safeParse({ ...okForm, occasion: "birthday" }).success);
    assert.ok(!posterFormSchema.safeParse({ ...okForm, headlineFont: "comic-sans" }).success);
    assert.ok(posterFormSchema.safeParse({ ...okForm, headlineFont: "galada" }).success);
    assert.ok(!posterFormSchema.safeParse({ ...okForm, frame: "star" }).success);
  });

  it("requires explicit consent to create a poster", () => {
    assert.ok(!createPosterSchema.safeParse({ templateId: "t", formData: okForm }).success);
    assert.ok(!createPosterSchema.safeParse({ templateId: "t", formData: okForm, consent: false }).success);
    assert.ok(!createPosterSchema.safeParse({ templateId: "t", formData: okForm, consent: "true" }).success);
    assert.ok(createPosterSchema.safeParse({ templateId: "t", formData: okForm, consent: true }).success);
  });

  it("caps bulk requests", () => {
    const rows = Array.from({ length: 31 }, () => ({ name: "x" }));
    assert.ok(!bulkPosterSchema.safeParse({ templateId: "t", consent: true, base: {}, rows }).success);
    assert.ok(bulkPosterSchema.safeParse({ templateId: "t", consent: true, base: {}, rows: rows.slice(0, 30) }).success);
    assert.ok(!bulkPosterSchema.safeParse({ templateId: "t", consent: true, base: {}, rows: [] }).success);
  });

  it("regenerate accepts partial edits (they are validated after merging)", () => {
    const r = regeneratePosterSchema.parse({ formData: { headline: "নতুন শিরোনাম" } });
    assert.equal(r.keepStyle, false);
    assert.deepEqual(r.formData, { headline: "নতুন শিরোনাম" });
  });
});
