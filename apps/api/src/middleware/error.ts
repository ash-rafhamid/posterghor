import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../config/env";
import { HttpError } from "../lib/errors";
import { logger } from "../lib/logger";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: "Route not found", code: "NOT_FOUND" });
}

/** One place that turns every failure into `{ message, code, details? }`. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, code: err.code, details: err.details });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ message: err.issues[0]?.message ?? "Invalid request", code: "VALIDATION_ERROR", details: err.issues });
    return;
  }
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    res.status(tooBig ? 413 : 400).json({
      message: tooBig ? `That photo is too large. The limit is ${env.MAX_UPLOAD_MB} MB.` : "Upload failed. Please try again with a JPG or PNG photo.",
      code: tooBig ? "FILE_TOO_LARGE" : "UPLOAD_ERROR",
    });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(404).json({ message: "Not found", code: "NOT_FOUND" });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ message: Object.values(err.errors)[0]?.message ?? "Invalid data", code: "VALIDATION_ERROR" });
    return;
  }
  if (typeof err === "object" && err && (err as { code?: number }).code === 11000) {
    res.status(409).json({ message: "That value is already in use", code: "CONFLICT" });
    return;
  }
  if (err instanceof SyntaxError && "body" in (err as object)) {
    res.status(400).json({ message: "Malformed JSON body", code: "BAD_JSON" });
    return;
  }
  logger.error({ err, path: req.path, method: req.method }, "unhandled error");
  res.status(500).json({ message: env.isProd ? "Something went wrong on our side." : (err as Error)?.message || "Internal error", code: "INTERNAL" });
}
