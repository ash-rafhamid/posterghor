import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  sub: string;
  role: "user" | "admin";
}

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, 11);

/**
 * A real hash of a random string. Compared against when a login names an unknown account, so response time
 * doesn't reveal which emails / numbers are registered.
 */
export const DUMMY_HASH = bcrypt.hashSync(randomUUID(), 11);
export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"], algorithm: "HS256" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decoded === "string" || !decoded.sub) return null;
    return { sub: String(decoded.sub), role: (decoded as JwtPayload).role === "admin" ? "admin" : "user" };
  } catch {
    return null;
  }
}
