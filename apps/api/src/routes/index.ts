import { Router } from "express";
import mongoose from "mongoose";
import { env } from "../config/env";
import { queueStats } from "../services/queue";
import { adminRouter } from "./admin";
import { aiRouter } from "./ai";
import { authRouter } from "./auth";
import { postersRouter } from "./posters";
import { templatesRouter } from "./templates";
import { uploadRouter } from "./upload";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    ok: dbUp,
    uptime: Math.round(process.uptime()),
    db: dbUp ? "connected" : "disconnected",
    gemini: env.geminiEnabled,
    storage: env.storageDriver,
    queue: queueStats(),
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/templates", templatesRouter);
apiRouter.use("/posters", postersRouter);
apiRouter.use("/upload", uploadRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/", aiRouter); // /api/config, /api/ai/suggest
