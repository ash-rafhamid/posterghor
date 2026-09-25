import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { normalizeUpload } from "../services/images";

const solid = (width: number, height: number, alpha = 1) =>
  sharp({ create: { width, height, channels: 4, background: { r: 11, g: 107, b: 79, alpha } } });

const rejectsAsInvalidImage = (input: Buffer) =>
  assert.rejects(normalizeUpload(input), (e: { status?: number; code?: string }) => e.status === 400 && e.code === "INVALID_IMAGE");

describe("upload normalisation", () => {
  it("turns an opaque photo into a JPEG", async () => {
    const out = await normalizeUpload(await solid(800, 600).jpeg().toBuffer());
    assert.equal(out.contentType, "image/jpeg");
    assert.equal(out.ext, "jpg");
    assert.equal(out.hasAlpha, false);
    assert.deepEqual([out.width, out.height], [800, 600]);
    assert.equal((await sharp(out.buffer).metadata()).format, "jpeg");
  });

  it("caps very large images at 2000px on the long side", async () => {
    const out = await normalizeUpload(await solid(3000, 1000).jpeg().toBuffer());
    assert.deepEqual([out.width, out.height], [2000, 667]);
  });

  it("never enlarges small images, and flags low resolution", async () => {
    const small = await normalizeUpload(await solid(300, 300).jpeg().toBuffer());
    assert.deepEqual([small.width, small.height], [300, 300]);
    assert.equal(small.lowRes, true);
    assert.equal((await normalizeUpload(await solid(900, 900).jpeg().toBuffer())).lowRes, false);
  });

  it("applies EXIF rotation and strips all metadata", async () => {
    const withExif = await solid(400, 200).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    assert.equal((await sharp(withExif).metadata()).orientation, 6, "fixture really carries an orientation tag");
    const out = await normalizeUpload(withExif);
    assert.deepEqual([out.width, out.height], [200, 400], "rotated upright");
    const meta = await sharp(out.buffer).metadata();
    assert.equal(meta.exif, undefined, "no EXIF (GPS etc.) is kept");
    assert.equal(meta.orientation, undefined);
  });

  it("keeps real transparency (cut-out portraits) as PNG", async () => {
    const out = await normalizeUpload(await solid(500, 500, 0.5).png().toBuffer());
    assert.equal(out.contentType, "image/png");
    assert.equal(out.ext, "png");
    assert.equal(out.hasAlpha, true);
  });

  it("does not treat a fully opaque alpha channel as a cut-out", async () => {
    const out = await normalizeUpload(await solid(500, 500, 1).png().toBuffer());
    assert.equal(out.hasAlpha, false);
    assert.equal(out.ext, "jpg");
  });

  it("accepts WebP", async () => {
    const out = await normalizeUpload(await solid(640, 480).webp().toBuffer());
    assert.equal(out.ext, "jpg");
  });

  it("rejects things that are not images, whatever they claim to be", async () => {
    await rejectsAsInvalidImage(Buffer.from("definitely not an image"));
    await rejectsAsInvalidImage(Buffer.alloc(0));
    await rejectsAsInvalidImage(Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n"));
    await rejectsAsInvalidImage(Buffer.from("GIF89a-but-truncated"));
  });

  it("rejects SVG (it can carry scripts and external references)", async () => {
    await rejectsAsInvalidImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>'));
  });
});
