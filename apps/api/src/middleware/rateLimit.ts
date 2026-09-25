import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/** Per-user key when signed in, otherwise per-IP (IPv6-safe). */
const userOrIp = (req: Request): string => (req.user ? `u:${String(req.user._id)}` : `ip:${ipKeyGenerator(req.ip ?? "0.0.0.0")}`);

const limiter = (opts: { windowMs: number; limit: number; message: string; byUser?: boolean }) =>
  rateLimit({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: opts.byUser ? userOrIp : (req) => ipKeyGenerator(req.ip ?? "0.0.0.0"),
    handler: (_req, res) => {
      res.status(429).json({ message: opts.message, code: "RATE_LIMITED" });
    },
  });

/** Whole API — generous, just a safety net. */
export const apiLimiter = limiter({ windowMs: 5 * 60_000, limit: 600, message: "Too many requests. Please slow down for a moment." });

/** Register / login — slows password guessing. */
export const authLimiter = limiter({ windowMs: 15 * 60_000, limit: 30, message: "Too many sign-in attempts. Please try again in a few minutes." });

/** Poster generation + regeneration — the expensive endpoints (Gemini + headless Chrome). */
export const generateLimiter = limiter({
  windowMs: 10 * 60_000,
  limit: 12,
  byUser: true,
  message: "You're generating posters very quickly. Please wait a few minutes before creating more.",
});

export const uploadLimiter = limiter({ windowMs: 10 * 60_000, limit: 60, byUser: true, message: "Too many uploads. Please wait a few minutes." });

export const aiLimiter = limiter({ windowMs: 10 * 60_000, limit: 30, byUser: true, message: "Too many AI suggestions. Please wait a few minutes." });
