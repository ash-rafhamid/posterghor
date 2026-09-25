import type { StorageProvider } from "../services/storage/types";

/** `<uuid>.jpg` / `<uuid>.png` — the only file names the upload route ever produces. */
const UPLOAD_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png)$/;

/**
 * True only for a file this app stored in *this user's* upload folder (`…/uploads/<userId>/<uuid>.jpg|png`).
 *
 * Every photo URL a client submits goes through here, so the API can't be turned into a fetch-anything proxy (SSRF)
 * and one person can't attach another's photos. A substring test isn't enough — `…/uploads/<me>/../<them>/x.jpg` and
 * `…/x.jpg?/uploads/<me>/` both *contain* the folder name yet point somewhere else — so the URL must be a plain path
 * (no query, fragment, credentials, escapes or dot-segments) whose last three segments are exactly that shape.
 */
export function isOwnUpload(storage: Pick<StorageProvider, "owns">, url: unknown, userId: string): boolean {
  if (typeof url !== "string" || url.length > 1200 || !userId || !storage.owns(url)) return false;
  if (/[?#\\%@\s]/.test(url) || /\/\.{1,2}(?:\/|$)/.test(url)) return false;
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  const seg = pathname.split("/").filter(Boolean);
  const n = seg.length;
  return n >= 3 && seg[n - 3] === "uploads" && seg[n - 2] === userId && UPLOAD_FILE_RE.test(seg[n - 1]!);
}
