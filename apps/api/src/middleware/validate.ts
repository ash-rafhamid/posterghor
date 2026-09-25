import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { badRequest } from "../lib/errors";

type Source = "body" | "query" | "params";

/** Validates + replaces `req[source]` with the parsed (cleaned, defaulted) value. */
export function validate<T>(schema: ZodType<T>, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues;
      const first = issues[0];
      const field = first?.path.join(".");
      const message = first ? (field ? `${humanise(field)}: ${first.message}` : first.message) : "Invalid request";
      throw badRequest(message, "VALIDATION_ERROR", issues.map((i) => ({ path: i.path.join("."), message: i.message })));
    }
    // Express 5 exposes req.query as a prototype getter, so shadow it on the instance instead of assigning.
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true, enumerable: true });
    next();
  };
}

const humanise = (path: string): string => {
  const last = path.split(".").pop() ?? path;
  return last.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
};
