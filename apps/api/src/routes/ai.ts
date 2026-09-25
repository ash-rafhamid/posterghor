import { Router } from "express";
import { z } from "zod";
import { BULK_MAX_ROWS, MAX_PHOTOS, OCCASION_IDS, TONE_IDS } from "@poster/shared";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";
import { aiLimiter } from "../middleware/rateLimit";
import { validate } from "../middleware/validate";
import { suggestText } from "../services/ai/text-suggest";

export const aiRouter = Router();

/** GET /api/config — what this deployment can do (drives small UI hints, e.g. the "Gemini connected" chip). */
aiRouter.get("/config", (_req, res) => {
  res.set("Cache-Control", "public, max-age=60");
  res.json({
    ai: { gemini: env.geminiEnabled, textModel: env.geminiEnabled ? env.GEMINI_TEXT_MODEL : null, backdrops: env.geminiEnabled && env.AI_BACKDROPS_ENABLED },
    limits: { maxRegenerations: env.MAX_REGENERATIONS, maxUploadMb: env.MAX_UPLOAD_MB, maxPhotos: MAX_PHOTOS, dailyPosters: env.DAILY_POSTER_LIMIT, bulkMaxRows: BULK_MAX_ROWS },
    storage: env.storageDriver,
  });
});

const suggestBody = z.object({ occasion: z.enum(OCCASION_IDS), tone: z.enum(TONE_IDS as [string, ...string[]]).optional() });

/** POST /api/ai/suggest — Bangla headline ideas for an occasion (cached; no personal data leaves the server). */
aiRouter.post("/ai/suggest", requireAuth, aiLimiter, validate(suggestBody), async (req, res) => {
  const { occasion, tone } = req.body as z.infer<typeof suggestBody>;
  res.json(await suggestText(occasion, tone));
});
