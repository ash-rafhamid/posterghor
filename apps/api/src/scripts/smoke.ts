/**
 * End-to-end smoke test against a running API:
 *   login → templates → upload photos → create poster → poll → download PNG/JPG/PDF → regenerate → history → delete
 *
 *   npm run smoke -w @poster/api          (API must be running; defaults to http://localhost:4000)
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { avatarSvg } from "@poster/shared";

const API = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const out = path.resolve(process.cwd(), "../../.scratch/smoke");
await fs.mkdir(out, { recursive: true });

let token = "";
const step = (msg: string) => console.log(`\n▸ ${msg}`);
const ok = (msg: string) => console.log(`  ✔ ${msg}`);
const fail = (msg: string): never => {
  console.error(`  ✘ ${msg}`);
  process.exit(1);
};

async function call<T = any>(p: string, init: RequestInit & { json?: unknown; expect?: number; noAuth?: boolean } = {}): Promise<{ status: number; body: T; res: Response }> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token && !init.noAuth) headers.Authorization = `Bearer ${token}`;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(init.json);
  }
  const res = await fetch(`${API}${p}`, { ...init, headers });
  const ct = res.headers.get("content-type") ?? "";
  const body = (ct.includes("json") ? await res.json().catch(() => null) : null) as T;
  if (init.expect !== undefined && res.status !== init.expect) fail(`${init.method ?? "GET"} ${p} → ${res.status} (expected ${init.expect}) ${JSON.stringify(body)}`);
  return { status: res.status, body, res };
}

async function photoBlob(i: number): Promise<Blob> {
  const jpg = await sharp(Buffer.from(avatarSvg(i))).resize(900, 1125).jpeg({ quality: 90 }).toBuffer();
  return new Blob([new Uint8Array(jpg)], { type: "image/jpeg" });
}

async function upload(i: number): Promise<string> {
  const form = new FormData();
  form.append("file", await photoBlob(i), `photo-${i}.jpg`);
  const { body } = await call<{ url: string }>("/api/upload", { method: "POST", body: form, expect: 201 });
  return body.url;
}

async function waitFor(id: string, label: string, timeoutMs = 90_000) {
  const t0 = Date.now();
  let last = "";
  while (Date.now() - t0 < timeoutMs) {
    const { body } = await call<{ poster: any }>(`/api/posters/${id}`, { expect: 200 });
    const p = body.poster;
    const tag = `${p.status}/${p.progress.stage}/${p.progress.pct}%`;
    if (tag !== last) {
      console.log(`    … ${tag}`);
      last = tag;
    }
    if (p.status === "completed") {
      ok(`${label} completed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return p;
    }
    if (p.status === "failed") fail(`${label} failed: ${p.error}`);
    await new Promise((r) => setTimeout(r, 700));
  }
  return fail(`${label} timed out`);
}

step("health");
const health = await call("/api/health", { expect: 200 });
ok(JSON.stringify(health.body));

step("login as the demo user");
const login = await call<{ token: string; user: { id: string; name: string } }>("/api/auth/login", { method: "POST", json: { identifier: "demo@poster.local", password: "Demo@12345" }, expect: 200 });
token = login.body.token;
ok(`signed in as ${login.body.user.name}`);
await call("/api/auth/login", { method: "POST", json: { identifier: "demo@poster.local", password: "wrong-password" }, expect: 401 });
ok("wrong password rejected (401)");
await call("/api/posters", { noAuth: true, expect: 401 });
ok("history requires auth (401)");

step("templates");
const tpls = await call<{ items: Array<{ id: string; slug: string; occasionType: string; thumbnailUrl?: string }> }>("/api/templates", { expect: 200 });
ok(`${tpls.body.items.length} templates: ${tpls.body.items.map((t) => t.slug).join(", ")}`);
const filtered = await call<{ items: unknown[] }>("/api/templates?occasion=campaign", { expect: 200 });
ok(`occasion filter → ${filtered.body.items.length} campaign templates`);
const victory = tpls.body.items.find((t) => t.slug === "bijoy-gourab") ?? fail("victory template missing");

step("upload photos");
const urls = [await upload(0), await upload(1), await upload(2)];
ok(`uploaded ${urls.length} photos`);
const bad = new FormData();
bad.append("file", new Blob(["this is not an image"], { type: "image/jpeg" }), "fake.jpg");
await call("/api/upload", { method: "POST", body: bad, expect: 400 });
ok("fake image rejected (400)");

step("create poster");
const formData = {
  occasion: "victory",
  headline: "মহান বিজয় দিবস",
  subheadline: "১৬ ডিসেম্বর — লাল-সবুজের গৌরবের দিন",
  dateText: "১৬ ডিসেম্বর ২০২৬",
  name: "মোঃ আবদুর রহমান",
  designation: "সভাপতি, ৫নং ওয়ার্ড কমিটি",
  party: "গণকল্যাণ সংঘ",
  union: "৫নং ইউনিয়ন",
  thana: "সদর থানা",
  district: "ময়মনসিংহ জেলা",
  creditLabel: "প্রচারে",
  photos: [
    { url: urls[0]!, caption: "আলহাজ্ব করিম উদ্দিন", subcaption: "সভাপতি" },
    { url: urls[1]!, caption: "সাবিনা ইয়াসমিন", subcaption: "সম্পাদক" },
    { url: urls[2]!, caption: "মোঃ রফিকুল ইসলাম", subcaption: "সদস্য" },
  ],
};
await call("/api/posters", { method: "POST", json: { templateId: victory.id, formData }, expect: 400 });
ok("missing consent rejected (400)");
await call("/api/posters", { method: "POST", json: { templateId: victory.id, consent: true, formData: { ...formData, headline: "সবাইকে হত্যা করুন" } }, expect: 422 });
ok("violent headline blocked by moderation (422)");
await call("/api/posters", { method: "POST", json: { templateId: victory.id, consent: true, formData: { ...formData, photos: [{ url: "http://169.254.169.254/latest/meta-data" }] } }, expect: 400 });
ok("foreign photo URL rejected — SSRF guard (400)");
const created = await call<{ poster: { id: string; status: string } }>("/api/posters", { method: "POST", json: { templateId: victory.id, consent: true, formData }, expect: 202 });
const id = created.body.poster.id;
ok(`poster ${id} accepted (${created.body.poster.status})`);

step("wait for the render");
const done = await waitFor(id, "poster");
ok(`${done.width}×${done.height}px · source=${done.scheme?.source} · colourway=${done.scheme?.colorwayName}`);

step("download");
for (const format of ["png", "jpg", "pdf"] as const) {
  const r = await fetch(`${API}/api/posters/${id}/download?format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) fail(`download ${format} → ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const file = path.join(out, `poster.${format}`);
  await fs.writeFile(file, buf);
  if (format !== "pdf") {
    const meta = await sharp(buf).metadata();
    ok(`${format.toUpperCase()} ${meta.width}×${meta.height} · ${(buf.length / 1024).toFixed(0)} KB → ${path.relative(process.cwd(), file)}`);
  } else {
    ok(`PDF ${(buf.length / 1024).toFixed(0)} KB (${buf.subarray(0, 5).toString()}) → ${path.relative(process.cwd(), file)}`);
  }
}
await call(`/api/posters/${id}/download?format=png`, { noAuth: true, expect: 401 });
ok("download requires auth");

step("regenerate (another look)");
const regen = await call<{ poster: { regenRemaining: number } }>(`/api/posters/${id}/regenerate`, { method: "POST", json: {}, expect: 202 });
ok(`accepted — ${regen.body.poster.regenRemaining} retries left`);
const p2 = await waitFor(id, "regeneration");
ok(`versions: ${p2.versions.length} · colourway now: ${p2.scheme?.colorwayName}`);
const edited = await call<{ poster: { formData: { name: string } } }>(`/api/posters/${id}/regenerate`, { method: "POST", json: { keepStyle: true, formData: { name: "মোঃ আবদুর করিম" } }, expect: 202 });
ok(`text edit accepted → name=${edited.body.poster.formData.name}`);
const p3 = await waitFor(id, "text-only re-render");
ok(`versions: ${p3.versions.length}`);
await call(`/api/posters/${id}/regenerate`, { method: "POST", json: {}, expect: 202 });
await waitFor(id, "4th render");
const limited = await call(`/api/posters/${id}/regenerate`, { method: "POST", json: {}, expect: 403 });
ok(`limit enforced: ${JSON.stringify((limited.body as { code?: string }).code)}`);

step("history");
const list = await call<{ items: Array<{ id: string; status: string }>; total: number }>("/api/posters", { expect: 200 });
ok(`${list.body.total} poster(s) in history`);
const mine = await call<{ total: number }>(`/api/posters/user/${login.body.user.id}`, { expect: 200 });
ok(`GET /posters/user/:id → ${mine.body.total}`);
await call(`/api/posters/user/000000000000000000000000`, { expect: 403 });
ok("other users' history is forbidden (403)");

step("bulk (CSV rows → posters)");
const bulk = await call<{ posters: Array<{ id: string }>; skipped: Array<{ row: number; reason: string }> }>("/api/posters/bulk", {
  method: "POST",
  json: {
    templateId: victory.id,
    consent: true,
    base: { headline: "মহান বিজয় দিবস", creditLabel: "প্রচারে", district: "ঢাকা জেলা", photos: [{ url: urls[0]!, caption: "", subcaption: "" }] },
    rows: [{ name: "মোঃ করিম উদ্দিন", designation: "সভাপতি" }, { name: "সাবিনা ইয়াসমিন", union: "৩নং ইউনিয়ন" }, { designation: "no name given" }, { name: "সবাইকে হত্যা করুন" }],
  },
  expect: 202,
});
ok(`${bulk.body.posters.length} queued · skipped: ${bulk.body.skipped.map((s) => `row ${s.row}`).join(", ")}`);
if (bulk.body.posters.length !== 2 || bulk.body.skipped.length !== 2) fail("expected 2 created + 2 skipped rows");
const batchIds = bulk.body.posters.map((p) => p.id).join(",");
for (let i = 0; i < 90; i++) {
  const { body } = await call<{ items: Array<{ status: string }> }>(`/api/posters/batch?ids=${batchIds}`, { expect: 200 });
  if (body.items.every((p) => p.status === "completed")) break;
  if (body.items.some((p) => p.status === "failed")) fail("a bulk poster failed");
  await new Promise((r) => setTimeout(r, 700));
}
ok("both bulk posters completed");
const zipRes = await fetch(`${API}/api/posters/bulk/zip?ids=${batchIds}&format=png`, { headers: { Authorization: `Bearer ${token}` } });
const zipBuf = Buffer.from(await zipRes.arrayBuffer());
if (zipRes.status !== 200 || zipBuf.subarray(0, 2).toString() !== "PK") fail(`zip download failed (${zipRes.status})`);
await fs.writeFile(path.join(out, "batch.zip"), zipBuf);
ok(`ZIP ${(zipBuf.length / 1024).toFixed(0)} KB (PK header) → .scratch/smoke/batch.zip`);
for (const id2 of bulk.body.posters.map((p) => p.id)) await call(`/api/posters/${id2}`, { method: "DELETE", expect: 204 });

step("admin");
const adminLogin = await call<{ token: string }>("/api/auth/login", { method: "POST", json: { identifier: "admin@poster.local", password: "Admin@12345" }, expect: 200 });
const userToken = token;
token = adminLogin.body.token;
const stats = await call<any>("/api/admin/stats", { expect: 200 });
ok(`stats: ${stats.body.posters} posters · ${stats.body.users} users · avg render ${stats.body.avgRenderMs}ms`);
const queue = await call<any>("/api/admin/posters?pageSize=5", { expect: 200 });
ok(`moderation list: ${queue.body.total} posters`);
token = userToken;
await call("/api/admin/stats", { expect: 403 });
ok("non-admin blocked from /api/admin (403)");

step("delete");
await call(`/api/posters/${id}`, { method: "DELETE", expect: 204 });
await call(`/api/posters/${id}`, { expect: 404 });
ok("poster deleted");

console.log("\n✅ smoke test passed");
