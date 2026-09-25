import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrast, ensureContrast, hexToRgb, isHex, luminance, mix, readableOn, sanitizeHex } from "../color";

describe("colour helpers", () => {
  it("sanitises anything that could end up in a stylesheet", () => {
    assert.equal(sanitizeHex("#ABC", "#000000"), "#aabbcc");
    assert.equal(sanitizeHex("0b6b4f", "#000000"), "#0b6b4f");
    assert.equal(sanitizeHex("  #0B6B4F ", "#000000"), "#0b6b4f");
    for (const evil of ["red; background:url(//x)", "javascript:alert(1)", "#12345", "rgb(1,2,3)", "#fff;}", 42, null, undefined, {}]) {
      assert.equal(sanitizeHex(evil, "#111111"), "#111111", String(evil));
      assert.equal(isHex(evil), false, String(evil));
    }
  });

  it("computes WCAG contrast", () => {
    assert.ok(Math.abs(contrast("#000000", "#ffffff") - 21) < 0.01);
    assert.ok(Math.abs(contrast("#777777", "#777777") - 1) < 0.001);
    assert.equal(contrast("#123456", "#fedcba"), contrast("#fedcba", "#123456"), "symmetric");
    assert.ok(luminance("#ffffff") > luminance("#0b6b4f"));
  });

  it("nudges a colour until it is readable", () => {
    const fixed = ensureContrast("#444444", "#222222", 4.5);
    assert.ok(contrast(fixed, "#222222") >= 4.5);
    assert.equal(ensureContrast("#ffffff", "#000000", 4.5), "#ffffff", "already readable → untouched");
    const onLight = ensureContrast("#bbbbbb", "#eeeeee", 4.5);
    assert.ok(contrast(onLight, "#eeeeee") >= 4.5, "darkens on a light background");
  });

  it("picks the more readable of two text colours", () => {
    assert.equal(readableOn("#000000"), "#ffffff");
    assert.equal(readableOn("#ffffff"), "#111111");
  });

  it("mixes linearly", () => {
    assert.deepEqual(hexToRgb(mix("#000000", "#ffffff", 0.5)), { r: 128, g: 128, b: 128 });
    assert.equal(mix("#123456", "#abcdef", 0), "#123456");
    assert.equal(mix("#123456", "#abcdef", 1), "#abcdef");
  });
});
