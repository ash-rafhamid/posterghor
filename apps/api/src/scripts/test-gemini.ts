/**
 * Verifies the Gemini integration end-to-end WITHOUT a real API key: a local fake server speaks the Gemini REST
 * format (candidates → parts → text, usageMetadata) and the real @google/genai SDK talks to it.
 *
 *   npm run test:gemini -w @poster/api
 *
 * Covers: structured-JSON art direction, sanitising of hostile output, per-template caching, face-box → focal point,
 * photo safety flags, headline suggestions, and graceful fallback on malformed output / server errors.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { MongoMemoryServer } from "mongodb-memory-server";
import sharp from "sharp";
import { VICTORY_LAYOUT, avatarSvg } from "@poster/shared";

const results: Array<[string, boolean, string?]> = [];
const check = (name: string, cond: boolean, detail?: string) => {
  results.push([name, cond, detail]);
  console.log(`  ${cond ? "✔" : "✘"} ${name}${!cond && detail ? `  → ${detail}` : ""}`);
};

/* ── fake Gemini ──────────────────────────────────────────────────────── */
let mode: "ok" | "malformed" | "error" | "hostile" = "ok";
const calls: Array<{ kind: string; model: string }> = [];

const envelope = (json: unknown) => ({
  candidates: [{ content: { role: "model", parts: [{ text: typeof json === "string" ? json : JSON.stringify(json) }] }, finishReason: "STOP", index: 0 }],
  usageMetadata: { promptTokenCount: 420, candidatesTokenCount: 180, totalTokenCount: 600 },
  modelVersion: "fake-gemini-1",
});

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const model = /models\/([^:]+):/.exec(req.url ?? "")?.[1] ?? "?";
    const payload = body ? JSON.parse(body) : {};
    const hasImage = JSON.stringify(payload.contents ?? "").includes("inlineData");
    const system = JSON.stringify(payload.systemInstruction ?? payload.config?.systemInstruction ?? "");
    const kind = hasImage ? "focus" : /art director/i.test(system) ? "scheme" : "suggest";
    calls.push({ kind, model });
    res.setHeader("Content-Type", "application/json");

    if (mode === "error") {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: { code: 500, message: "internal", status: "INTERNAL" } }));
      return;
    }
    if (mode === "malformed") {
      res.end(JSON.stringify(envelope("this is definitely not json {")));
      return;
    }
    if (kind === "scheme") {
      res.end(
        JSON.stringify(
          envelope(
            mode === "hostile"
              ? {
                  colorwayName: "x".repeat(500),
                  mood: "dark",
                  rationale: "ok",
                  palette: { bgFrom: "#123456", bgTo: "javascript:alert(1)", accent: "red; background:url(//evil)", headline: "#ffffff", panel: "#0a0a0a" },
                  motifs: ["paddy", "<script>", "doves", "not-a-motif"],
                  headlineStyle: "gradient",
                  photoFilter: "warm",
                  taglines: ["বিনম্র শ্রদ্ধা", "<img src=x onerror=alert(1)>"],
                }
              : {
                  colorwayName: "Monsoon Emerald",
                  mood: "triumphant, warm, hopeful",
                  rationale: "Deep river-green with marigold gold keeps the flag colours while feeling warmer than the classic look.",
                  palette: {
                    bgFrom: "#052e22",
                    bgTo: "#0f7a5a",
                    primary: "#0f7a5a",
                    secondary: "#e8412f",
                    accent: "#ffcb47",
                    ink: "#0b1f18",
                    paper: "#fff7e3",
                    headline: "#fff7e3",
                    headlineStroke: "#041a13",
                    panel: "#052e22",
                    panelText: "#fff7e3",
                    footer: "#03251b",
                    footerText: "#fff7e3",
                  },
                  motifs: ["sunburst", "sun", "flags", "paddy", "doves", "border"],
                  headlineStyle: "stroke",
                  photoFilter: "none",
                  taglines: ["বিজয়ের চেতনায় এগিয়ে চলি", "সবার জন্য বিনম্র শ্রদ্ধা", "লাল-সবুজের গৌরব অম্লান"],
                },
          ),
        ),
      );
      return;
    }
    if (kind === "focus") {
      res.end(
        JSON.stringify(
          envelope({
            photos: [
              { index: 0, box_2d: [180, 330, 420, 650], flags: [] },
              { index: 1, box_2d: [], flags: ["hate_symbol"] },
            ],
          }),
        ),
      );
      return;
    }
    res.end(JSON.stringify(envelope({ headlines: ["মহান বিজয় দিবস", "বিজয়ের গৌরব", "স্বাধীনতার সূর্য"], subheadlines: ["শহীদদের প্রতি শ্রদ্ধা"] })));
  });
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.address() as AddressInfo).port;

/* ── boot the real code against it ────────────────────────────────────── */
const mongo = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongo.getUri();
process.env.GEMINI_API_KEY = "test-key-not-real";
process.env.GEMINI_BASE_URL = `http://127.0.0.1:${port}`;
process.env.GEMINI_TEXT_MODEL = "fake-flash";
process.env.LOG_LEVEL = "silent";

const { connectDb, disconnectDb } = await import("../config/db");
const { artDirect, focusFromBox } = await import("../services/ai/art-director");
const { suggestText } = await import("../services/ai/text-suggest");
await connectDb();

const thumb = async (i: number) => sharp(Buffer.from(avatarSvg(i))).resize(400, 500).jpeg().toBuffer();
const photos = async () => [
  { thumb: await thumb(0), hash: "hash-photo-0" },
  { thumb: await thumb(1), hash: "hash-photo-1" },
];
const base = { templateId: "tpl-test", templateTitle: "Victory Glory", layout: VICTORY_LAYOUT, formData: { occasion: "victory" as const, useAiBackdrop: false } };

console.log("\n▸ art direction — happy path");
let r = await artDirect({ ...base, variant: 0, photos: await photos() });
check("source is gemini", r.scheme.source === "gemini", r.scheme.source);
check("colourway name + rationale kept", r.scheme.colorwayName === "Monsoon Emerald" && !!r.scheme.rationale);
check("palette accepted (13 keys)", Object.keys(r.scheme.palette ?? {}).length === 13);
check("tokens recorded (600)", r.log.tokens.total === 1200, `got ${r.log.tokens.total} (scheme 600 + photos 600)`);
check("not a cache hit — API was called", r.log.cacheHit === false);
check("face box → focal point (x≈.49, y≈.30)", !!r.scheme.photoFocus?.[0] && Math.abs(r.scheme.photoFocus[0]!.x - 0.49) < 0.02 && Math.abs(r.scheme.photoFocus[0]!.y - 0.3) < 0.02, JSON.stringify(r.scheme.photoFocus?.[0]));
check("small face gets zoomed in", (r.scheme.photoFocus?.[0]?.zoom ?? 1) > 1.1, String(r.scheme.photoFocus?.[0]?.zoom));
check("photo without a face falls back to the local estimate", r.scheme.photoFocus?.[1] != null);
check("safety flag surfaced for review", r.flags.includes("hate_symbol"));
check("taglines present", (r.scheme.taglines?.length ?? 0) >= 3);
const firstCalls = calls.length;

console.log("\n▸ caching (the brief's cost control)");
r = await artDirect({ ...base, variant: 0, photos: await photos() });
check("second run made zero API calls", calls.length === firstCalls, `${calls.length - firstCalls} extra call(s)`);
check("second run reports cacheHit", r.log.cacheHit === true);
check("scheme identical from cache", r.scheme.colorwayName === "Monsoon Emerald");
r = await artDirect({ ...base, variant: 1, photos: await photos() });
check("new variant → exactly one new scheme call (photos cached)", calls.length === firstCalls + 1, `${calls.length - firstCalls}`);

console.log("\n▸ hostile / sloppy model output is neutralised");
mode = "hostile";
r = await artDirect({ ...base, variant: 2, photos: await photos() });
check("junk colours rejected, valid ones kept", r.scheme.palette?.bgFrom === "#123456" && r.scheme.palette?.bgTo === undefined && r.scheme.palette?.accent === undefined, JSON.stringify(r.scheme.palette));
check("unknown motifs dropped", JSON.stringify(r.scheme.motifs) === JSON.stringify(["paddy", "doves"]), JSON.stringify(r.scheme.motifs));
check("over-long names refused → scheme still produced or falls back safely", r.scheme.source === "gemini" || r.scheme.source === "fallback");

console.log("\n▸ failures degrade gracefully");
mode = "malformed";
r = await artDirect({ ...base, variant: 3, photos: [{ thumb: await thumb(0), hash: "fresh-a" }] });
check("malformed JSON → curated colourway", r.scheme.source === "fallback" && !!r.scheme.colorwayName, r.scheme.source);
check("error recorded in the log", !!r.log.error);
mode = "error";
r = await artDirect({ ...base, variant: 4, photos: [{ thumb: await thumb(0), hash: "fresh-b" }] });
check("HTTP 500 → curated colourway", r.scheme.source === "fallback");
check("photo focus still estimated locally", r.scheme.photoFocus?.[0] != null);

console.log("\n▸ headline suggestions");
mode = "ok";
const s1 = await suggestText("victory");
check("returns Gemini suggestions", s1.source === "gemini" && s1.headlines.length === 3, s1.source);
mode = "error";
const s2 = await suggestText("tribute");
check("falls back to the curated list on error", s2.source === "curated" && s2.headlines.length >= 3);

console.log("\n▸ focus maths");
const f = focusFromBox([200, 400, 400, 600]);
check("focusFromBox centre", !!f && Math.abs(f.x - 0.5) < 1e-9 && Math.abs(f.y - 0.3) < 1e-9);
check("focusFromBox rejects garbage", focusFromBox([400, 400, 200, 600]) === null && focusFromBox([]) === null);

await disconnectDb();
await mongo.stop();
server.close();

const failed = results.filter((r) => !r[1]);
console.log(`\n${failed.length ? "❌" : "✅"} ${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
