/** Error carrying an HTTP status — rendered by the central error handler as `{ message, code, details }`. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST", details?: unknown) => new HttpError(400, message, code, details);
export const unauthorized = (message = "Please sign in to continue", code = "UNAUTHORIZED") => new HttpError(401, message, code);
export const forbidden = (message = "You don't have permission to do that", code = "FORBIDDEN") => new HttpError(403, message, code);
export const notFound = (message = "Not found", code = "NOT_FOUND") => new HttpError(404, message, code);
export const conflict = (message: string, code = "CONFLICT") => new HttpError(409, message, code);
export const unprocessable = (message: string, code = "UNPROCESSABLE", details?: unknown) => new HttpError(422, message, code, details);
