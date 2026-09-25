/**
 * Development runner for the API: starts the server and restarts it when a source file *really* changes.
 *
 * Why not `node --watch`? On Windows (NTFS keeps last-access times by default on many machines) simply *reading* a
 * watched file — which antivirus, indexers, other scripts and even `npm run smoke` do all the time — is reported as a
 * change, so the API restarted at random moments and dropped in-flight requests. Here an event only counts when the
 * file's modification time actually moved.
 *
 * Watches: apps/api/src and packages/shared/src (the poster engine the renderer uses).
 * Not watched: tests and one-off scripts (edit those freely), .env (restart by hand after changing it).
 */
import { spawn } from "node:child_process";
import { readdirSync, statSync, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dirs = [path.join(root, "src"), path.resolve(root, "../../packages/shared/src")];

const SOURCE = /\.(?:[cm]?[jt]sx?|json)$/;
const IGNORED = /(?:^|[\\/])(?:__tests__|scripts)[\\/]|\.test\.[cm]?[jt]sx?$/;
const wanted = (file) => SOURCE.test(file) && !IGNORED.test(file);

const mtimes = new Map();
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") scan(full);
    } else if (wanted(full)) {
      mtimes.set(full, statSync(full).mtimeMs);
    }
  }
}

let child = null;
let restarting = false;
let quitting = false;

function start() {
  child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], { cwd: root, stdio: "inherit" });
  child.on("exit", (code, signal) => {
    child = null;
    if (restarting) {
      restarting = false;
      start();
    } else if (!quitting) {
      console.log(`[dev] API stopped (${signal ?? `exit ${code}`}) — waiting for a file change…`);
    }
  });
}

function restart(reason) {
  console.log(`[dev] ${reason} — restarting API…`);
  if (!child) return start();
  restarting = true;
  child.kill();
}

let timer = null;
let changed = "";
function onEvent(dir, filename) {
  if (!filename) return;
  const file = path.join(dir, String(filename));
  if (!wanted(file)) return;
  let mtime = null;
  try {
    mtime = statSync(file).mtimeMs;
  } catch {
    /* deleted */
  }
  if (mtimes.get(file) === mtime || (mtime === null && !mtimes.has(file))) return; // read / attribute-only event
  if (mtime === null) mtimes.delete(file);
  else mtimes.set(file, mtime);
  changed = path.relative(path.resolve(root, "../.."), file).replaceAll("\\", "/");
  clearTimeout(timer);
  timer = setTimeout(() => restart(`${changed} changed`), 150);
}

for (const dir of dirs) {
  scan(dir);
  watch(dir, { recursive: true }, (_event, filename) => onEvent(dir, filename));
}

function quit() {
  quitting = true;
  if (child) child.kill();
  process.exit(0);
}
process.on("SIGINT", quit);
process.on("SIGTERM", quit);

start();
