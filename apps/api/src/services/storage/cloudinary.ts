import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env";
import type { StorageProvider, StoredFile } from "./types";

const MAX_DOWNLOAD_BYTES = 40 * 1024 * 1024;

/** Production storage. Reads credentials from CLOUDINARY_URL or the three CLOUDINARY_* variables. */
export class CloudinaryStorage implements StorageProvider {
  readonly name = "cloudinary" as const;
  private cloudName: string;

  constructor() {
    if (!env.CLOUDINARY_URL) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
      });
    }
    cloudinary.config({ secure: true });
    this.cloudName = cloudinary.config().cloud_name as string;
    if (!this.cloudName) throw new Error("Cloudinary is selected but no cloud name is configured");
  }

  async save({ buffer, folder, filename }: { buffer: Buffer; folder: string; filename: string; contentType: string }): Promise<StoredFile> {
    const publicId = filename.replace(/\.[a-z0-9]+$/i, "");
    const result = await new Promise<{ secure_url: string; public_id: string; bytes: number }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `${env.CLOUDINARY_FOLDER}/${folder}`, public_id: publicId, resource_type: "image", overwrite: true, unique_filename: false },
        (err, res) => (err || !res ? reject(err ?? new Error("Cloudinary upload failed")) : resolve(res)),
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, key: result.public_id, bytes: result.bytes };
  }

  owns(url: string): boolean {
    return url.startsWith(`https://res.cloudinary.com/${this.cloudName}/`);
  }

  async read(url: string): Promise<Buffer> {
    if (!this.owns(url)) throw new Error("URL does not belong to this storage");
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Could not fetch stored file (${res.status})`);
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_DOWNLOAD_BYTES) throw new Error("Stored file is too large");
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(url: string): Promise<void> {
    if (!this.owns(url)) return;
    // https://res.cloudinary.com/<cloud>/image/upload/v123/<public_id>.<ext>
    const m = /\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i.exec(new URL(url).pathname);
    if (m?.[1]) await cloudinary.uploader.destroy(decodeURIComponent(m[1])).catch(() => undefined);
  }
}
