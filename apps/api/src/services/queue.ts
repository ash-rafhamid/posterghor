import PQueue from "p-queue";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { Poster } from "../models/Poster";
import { runGeneration } from "./generation";

/**
 * In-process job queue. Posters are created with status "generating" and this queue drains them.
 * (Single-instance by design — fine for Render / a VPS. Swap for BullMQ + Redis to scale horizontally.)
 */
const queue = new PQueue({ concurrency: Math.max(2, env.RENDER_CONCURRENCY + 1) });
const inFlight = new Set<string>();

export function enqueueGeneration(posterId: string): void {
  if (inFlight.has(posterId)) return;
  inFlight.add(posterId);
  void queue
    .add(() => runGeneration(posterId))
    .catch((err) => logger.error({ err }, "generation job crashed"))
    .finally(() => inFlight.delete(posterId));
}

export function queueStats() {
  return { pending: queue.size, running: queue.pending };
}

/** After a restart, pick up posters that were mid-flight so nobody is left staring at a spinner. */
export async function recoverStuckJobs(): Promise<number> {
  const stuck = await Poster.find({ status: "generating" }).select("_id").lean();
  for (const p of stuck) enqueueGeneration(String(p._id));
  if (stuck.length) logger.info(`Re-queued ${stuck.length} interrupted poster(s)`);
  return stuck.length;
}

export async function drainQueue(): Promise<void> {
  await queue.onIdle();
}
