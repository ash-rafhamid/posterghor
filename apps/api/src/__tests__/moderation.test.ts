import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { focusFromBox } from "../services/ai/art-director";
import { describePhotoFlags, moderateText } from "../services/moderation";

const status = (headline: string) => moderateText({ headline }).status;

describe("text moderation", () => {
  it("lets ordinary and historical Bangla through", () => {
    for (const ok of [
      "মহান বিজয় দিবসের শুভেচ্ছা",
      "আপনার ভোট আপনার অধিকার",
      "শুভ নববর্ষ ১৪৩৩",
      "শহীদদের হত্যা করা হয়েছিল ১৯৭১ সালে", // past tense — history, not incitement
      "গণহত্যার বিচার চাই",
      "Victory Day greetings",
      "Begum Rokeya Day — begun with pride",
      "এগুলি আমাদের গর্ব", // “these” contains গুলি but is not a weapon reference
    ]) {
      assert.equal(status(ok), "clean", ok);
    }
  });

  it("blocks incitement, slurs and abuse", () => {
    for (const bad of ["সবাইকে হত্যা করুন", "তাকে খুন কর", "kill them all", "Murder him", "you whore"]) {
      assert.equal(status(bad), "blocked", bad);
    }
  });

  it("flags sensitive slogans for human review instead of blocking them", () => {
    for (const s of ["রাজাকারদের ফাঁসি চাই", "দালালদের বিরুদ্ধে ঘেরাও কর্মসূচি", "ban the party", "বন্দুকের গুলি", "bomb threat", "no weapons here"]) {
      assert.equal(status(s), "flagged", s);
    }
  });

  it("reports why", () => {
    const v = moderateText({ headline: "kill them all" });
    assert.equal(v.status, "blocked");
    assert.deepEqual(v.reasons, ["Incitement to violence"]);
    assert.deepEqual(moderateText({ headline: "শুভেচ্ছা" }), { status: "clean", reasons: [] });
    assert.deepEqual(moderateText({}), { status: "clean", reasons: [] });
  });

  it("screens every text field, including photo captions", () => {
    for (const field of ["subheadline", "name", "designation", "party", "union", "thana", "district", "dateText"] as const) {
      assert.equal(moderateText({ headline: "ok", [field]: "সবাইকে হত্যা করুন" }).status, "blocked", field);
    }
    const viaCaption = moderateText({ headline: "ok", photos: [{ url: "https://x.com/a.jpg", caption: "সবাইকে হত্যা করুন", subcaption: "" }] });
    assert.equal(viaCaption.status, "blocked");
    const viaSubcaption = moderateText({ headline: "ok", photos: [{ url: "https://x.com/a.jpg", caption: "", subcaption: "kill them all" }] });
    assert.equal(viaSubcaption.status, "blocked");
  });

  it("blocked beats flagged when both apply", () => {
    assert.equal(moderateText({ headline: "রাজাকারদের ফাঁসি চাই", subheadline: "kill them all" }).status, "blocked");
  });

  it("describes photo flags for the admin queue", () => {
    assert.deepEqual(describePhotoFlags(["explicit", "mystery"]), ["A photo may contain explicit content", "Photo flagged: mystery"]);
  });
});

describe("face box → focal point", () => {
  it("centres on the box and zooms in on small faces only", () => {
    const small = focusFromBox([200, 400, 300, 500])!;
    assert.ok(Math.abs(small.x - 0.45) < 1e-9 && Math.abs(small.y - 0.25) < 1e-9);
    assert.equal(small.zoom, 1.9, "tiny faces are capped at 1.9×");
    assert.ok(Math.abs(focusFromBox([100, 300, 300, 500])!.zoom - 1.5) < 1e-9);
    assert.equal(focusFromBox([100, 300, 700, 700])!.zoom, 1, "big face → leave alone");
  });

  it("rejects malformed boxes", () => {
    for (const bad of [[], [1, 2, 3], [500, 500, 400, 600], [500, 600, 600, 500], [NaN, 0, 1, 1]]) assert.equal(focusFromBox(bad), null, JSON.stringify(bad));
    assert.equal(focusFromBox(undefined), null);
  });

  it("clamps out-of-range coordinates instead of trusting the model", () => {
    const f = focusFromBox([-500, -500, 2000, 2000])!;
    assert.deepEqual([f.x, f.y, f.zoom], [0.5, 0.5, 1]);
  });
});
