import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import { logger } from "../lib/logger";
import { env } from "./env";

type MemoryServer = { getUri(): string; stop(opts?: { doCleanup?: boolean }): Promise<boolean> };
let embedded: MemoryServer | null = null;

/** Where the embedded MongoDB keeps its files (development only). */
export const DATA_DIR = path.resolve(process.cwd(), ".data");
const INFO_FILE = path.join(DATA_DIR, "mongo.json");

/**
 * Development database: an embedded MongoDB.
 *
 * Two things make this pleasant to work with:
 *  1. **Sharing** — the running instance's address is recorded in `.data/mongo.json`, so other processes
 *     (`npm run seed`, `npm run smoke`, a second script) attach to it instead of fighting over the data directory.
 *  2. **Stale-lock recovery** — watch-mode restarts and crashes can hard-kill the API (on Windows without running any
 *     shutdown handler), orphaning `mongod` with the data-directory lock held. If the recorded instance is no longer
 *     reachable, a leftover mongod named in `mongod.lock` is stopped before a fresh one is started.
 */
async function isReachable(uri: string): Promise<boolean> {
  try {
    const u = new URL(uri);
    await new Promise<void>((resolve, reject) => {
      const socket = net.connect({ host: u.hostname, port: Number(u.port) || 27017 });
      const done = (err?: Error) => {
        socket.destroy();
        err ? reject(err) : resolve();
      };
      socket.setTimeout(1200, () => done(new Error("timeout")));
      socket.once("connect", () => done());
      socket.once("error", done);
    });
    return true;
  } catch {
    return false;
  }
}

async function readInfo(): Promise<{ uri: string } | null> {
  try {
    const info = JSON.parse(await fs.readFile(INFO_FILE, "utf8")) as { uri?: string };
    return typeof info.uri === "string" ? { uri: info.uri } : null;
  } catch {
    return null;
  }
}

async function reapStaleMongod(dbPath: string): Promise<void> {
  const lock = path.join(dbPath, "mongod.lock");
  let pid: number;
  try {
    pid = Number.parseInt((await fs.readFile(lock, "utf8")).trim(), 10);
  } catch {
    return; // no lock file → nothing to reap
  }
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return; // empty file = clean shutdown
  try {
    process.kill(pid, 0); // throws if that PID isn't alive
  } catch {
    return;
  }
  try {
    // never kill an unrelated process that merely reused the PID
    const { execFileSync } = await import("node:child_process");
    const name =
      process.platform === "win32"
        ? execFileSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], { encoding: "utf8" })
        : execFileSync("ps", ["-p", String(pid), "-o", "comm="], { encoding: "utf8" });
    if (!/mongod/i.test(name)) return;
    process.kill(pid, "SIGKILL");
    logger.warn(`Stopped a stale embedded MongoDB (pid ${pid}) left over from a previous run`);
    await new Promise((r) => setTimeout(r, 800));
  } catch {
    /* best effort — if it can't be reaped, mongodb-memory-server will report the lock error */
  }
}

async function startEmbedded(): Promise<string> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  // Another process (usually `npm run dev`) already runs the embedded DB → just use it.
  const existing = await readInfo();
  if (existing && (await isReachable(existing.uri))) {
    logger.info("Attached to the embedded MongoDB that is already running");
    return existing.uri;
  }

  // Keep the (large) mongod binary in the user's cache instead of inside the repo.
  process.env.MONGOMS_DOWNLOAD_DIR ??= path.join(os.homedir(), ".cache", "mongodb-binaries");
  const dbPath = path.join(DATA_DIR, "mongo");
  await fs.mkdir(dbPath, { recursive: true });
  await reapStaleMongod(dbPath);
  logger.info("MONGODB_URI not set — starting an embedded MongoDB for development (first run downloads the mongod binary)…");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const server = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
  embedded = server;
  const uri = server.getUri();
  await fs.writeFile(INFO_FILE, JSON.stringify({ uri, pid: process.pid, startedAt: new Date().toISOString() })).catch(() => undefined);
  logger.info(`Embedded MongoDB ready (data in ${path.relative(process.cwd(), dbPath) || dbPath})`);
  return uri;
}

export async function connectDb(): Promise<void> {
  const uri = env.MONGODB_URI || (await startEmbedded());
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { dbName: env.MONGODB_DB, serverSelectionTimeoutMS: 20000 });
  logger.info(`MongoDB connected → ${mongoose.connection.name}`);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect().catch(() => undefined);
  // only the process that started the embedded server stops it (attached processes just disconnect)
  if (embedded) {
    await embedded.stop({ doCleanup: false }).catch(() => undefined);
    embedded = null;
    await fs.rm(INFO_FILE, { force: true }).catch(() => undefined);
  }
}
