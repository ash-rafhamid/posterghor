import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env";
import type { StorageProvider, StoredFile } from "./types";

export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
const PREFIX = `${env.publicApiUrl}/files/`;

/** Development storage: files live in apps/api/uploads and are served by Express at /files. */
export class LocalStorage implements StorageProvider {
  readonly name = "local" as const;

  private resolve(rel: string): string {
    const abs = path.resolve(UPLOAD_ROOT, rel);
    // refuse anything that escapes the upload root (../ tricks)
    if (abs !== UPLOAD_ROOT && !abs.startsWith(UPLOAD_ROOT + path.sep)) throw new Error("Invalid storage path");
    return abs;
  }

  async save({ buffer, folder, filename }: { buffer: Buffer; folder: string; filename: string; contentType: string }): Promise<StoredFile> {
    const rel = path.posix.join(folder, filename);
    const abs = this.resolve(rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buffer);
    return { url: `${PREFIX}${rel}`, key: rel, bytes: buffer.length };
  }

  owns(url: string): boolean {
    return url.startsWith(PREFIX);
  }

  async read(url: string): Promise<Buffer> {
    if (!this.owns(url)) throw new Error("URL does not belong to this storage");
    return fs.readFile(this.resolve(decodeURIComponent(url.slice(PREFIX.length))));
  }

  async delete(url: string): Promise<void> {
    if (!this.owns(url)) return;
    await fs.rm(this.resolve(decodeURIComponent(url.slice(PREFIX.length))), { force: true });
  }
}
