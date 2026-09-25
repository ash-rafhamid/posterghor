import type { NextFunction, Request, Response } from "express";
import { forbidden, unauthorized } from "../lib/errors";
import { verifyToken } from "../lib/auth";
import { User, type UserDoc } from "../models/User";

declare module "express-serve-static-core" {
  interface Request {
    user?: UserDoc;
  }
}

function bearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7).trim();
  return null;
}

/** Loads the signed-in user (fresh from the DB so blocks / role changes apply immediately). */
async function loadUser(req: Request): Promise<UserDoc | null> {
  const token = bearer(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await User.findById(payload.sub);
  if (!user || user.blocked) return null;
  return user;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const user = await loadUser(req);
  if (!user) throw unauthorized(bearer(req) ? "Your session has expired — please sign in again" : "Please sign in to continue", "UNAUTHORIZED");
  req.user = user;
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  req.user = (await loadUser(req)) ?? undefined;
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw unauthorized();
  if (req.user.role !== "admin") throw forbidden("Admin access required");
  next();
}
