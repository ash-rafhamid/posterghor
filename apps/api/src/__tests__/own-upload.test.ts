import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOwnUpload } from "../lib/own-upload";

const ME = "65a1b2c3d4e5f6a7b8c9d0e1";
const THEM = "65ffffffffffffffffffffff";
const FILE = "3f2b8c1e-6a4d-4f0b-9a57-2c1d8e7b9a10.jpg";
const FILE2 = "0a1b2c3d-4e5f-4a7b-8c9d-0e1f2a3b4c5d.png";

const local = { owns: (u: string) => u.startsWith("http://localhost:4000/files/") };
const cloud = { owns: (u: string) => u.startsWith("https://res.cloudinary.com/demo/") };
const L = "http://localhost:4000/files";
const C = "https://res.cloudinary.com/demo/image/upload/v1712345678/posterghor";

describe("isOwnUpload — the photo-URL allow-list", () => {
  it("accepts the caller's own uploads (local and Cloudinary layouts)", () => {
    assert.ok(isOwnUpload(local, `${L}/uploads/${ME}/${FILE}`, ME));
    assert.ok(isOwnUpload(local, `${L}/uploads/${ME}/${FILE2}`, ME));
    assert.ok(isOwnUpload(cloud, `${C}/uploads/${ME}/${FILE}`, ME));
  });

  it("rejects another user's uploads", () => {
    assert.ok(!isOwnUpload(local, `${L}/uploads/${THEM}/${FILE}`, ME));
    assert.ok(!isOwnUpload(cloud, `${C}/uploads/${THEM}/${FILE}`, ME));
  });

  it("rejects path traversal into someone else's folder", () => {
    for (const evil of [
      `${L}/uploads/${ME}/../${THEM}/${FILE}`,
      `${L}/uploads/${ME}/%2e%2e/${THEM}/${FILE}`,
      `${L}/uploads/${ME}/..%2f${THEM}/${FILE}`,
      `${L}/uploads/${ME}/..\\${THEM}\\${FILE}`,
      `${L}/uploads/${THEM}/../${ME}/${FILE}`,
      `${L}/uploads/./${ME}/${FILE}`,
      `${L}/../uploads/${ME}/${FILE}`,
    ]) {
      assert.ok(!isOwnUpload(local, evil, ME), evil);
    }
  });

  it("rejects the folder name smuggled into a query string or fragment", () => {
    assert.ok(!isOwnUpload(local, `${L}/uploads/${THEM}/${FILE}?/uploads/${ME}/${FILE}`, ME));
    assert.ok(!isOwnUpload(local, `${L}/uploads/${THEM}/${FILE}#/uploads/${ME}/${FILE}`, ME));
    assert.ok(!isOwnUpload(cloud, `${C}/uploads/${THEM}/${FILE}?x=/uploads/${ME}/${FILE}`, ME));
    assert.ok(!isOwnUpload(local, `${L}/uploads/${ME}/${FILE}?download=1`, ME), "even a harmless query string is refused");
  });

  it("rejects foreign hosts and look-alike prefixes", () => {
    for (const evil of [
      `https://evil.example/files/uploads/${ME}/${FILE}`,
      `http://localhost:4000@evil.example/files/uploads/${ME}/${FILE}`,
      `http://localhost:4000.evil.example/files/uploads/${ME}/${FILE}`,
      `http://169.254.169.254/latest/meta-data/`,
      `file:///etc/passwd`,
      `data:image/png;base64,AAAA`,
    ]) {
      assert.ok(!isOwnUpload(local, evil, ME), evil);
    }
    assert.ok(!isOwnUpload(cloud, `https://res.cloudinary.com.evil.example/demo/uploads/${ME}/${FILE}`, ME));
    assert.ok(!isOwnUpload(cloud, `https://res.cloudinary.com/other-cloud/image/upload/uploads/${ME}/${FILE}`, ME));
  });

  it("only accepts the file names the upload route produces", () => {
    for (const bad of ["avatar.jpg", `${FILE}.exe`, `${FILE}.svg`, "3f2b8c1e-6a4d-4f0b-9a57-2c1d8e7b9a10.gif", "3F2B8C1E-6A4D-4F0B-9A57-2C1D8E7B9A10.jpg", ".htaccess", ".."]) {
      assert.ok(!isOwnUpload(local, `${L}/uploads/${ME}/${bad}`, ME), bad);
    }
    assert.ok(!isOwnUpload(local, `${L}/uploads/${ME}/`, ME), "a folder, not a file");
    assert.ok(!isOwnUpload(local, `${L}/uploads/${ME}`, ME));
  });

  it("requires the exact folder shape (…/uploads/<user>/<file>)", () => {
    assert.ok(!isOwnUpload(local, `${L}/uploads/${ME}/nested/${FILE}`, ME));
    assert.ok(!isOwnUpload(local, `${L}/posters/${ME}/${FILE}`, ME));
    assert.ok(!isOwnUpload(local, `${L}/${ME}/${FILE}`, ME));
  });

  it("rejects malformed input outright", () => {
    for (const bad of [undefined, null, 42, {}, [], "", " ", `${L}/uploads/${ME}/${FILE} `, `${L}/uploads/${ME}/${FILE}\n`, `${L}/uploads/${ME}/${FILE}`.padEnd(1300, "a")]) {
      assert.ok(!isOwnUpload(local, bad, ME), JSON.stringify(bad)?.slice(0, 60));
    }
    assert.ok(!isOwnUpload(local, `${L}/uploads/${ME}/${FILE}`, ""), "no user id → nothing is 'own'");
  });
});
