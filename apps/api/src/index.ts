import type { Server } from "node:http";
import { createApp } from "./app";
import { connectDb, disconnectDb } from "./config/db";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { closeBrowser } from "./services/render/renderer";
import { drainQueue, recoverStuckJobs } from "./services/queue";

async function main(): Promise<void> {
  await connectDb();
  await recoverStuckJobs();

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`API listening on ${env.publicApiUrl.replace(/:\d+$/, "")}:${env.PORT}`);
    logger.info(
      `storage: ${env.storageDriver} · gemini: ${env.geminiEnabled ? `on (${env.GEMINI_TEXT_MODEL})` : "off (curated colourways + local crop estimate)"} · regenerations: ${env.MAX_REGENERATIONS}`,
    );
  });

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info(`${signal} received — shutting down gracefully`);
    server.close();
    await Promise.race([drainQueue(), new Promise((r) => setTimeout(r, 15000))]);
    await closeBrowser();
    await disconnectDb();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "unhandledRejection"));

main().catch((err) => {
  logger.fatal({ err }, "failed to start");
  process.exit(1);
});
