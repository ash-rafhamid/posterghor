import { env } from "../../config/env";
import { CloudinaryStorage } from "./cloudinary";
import { LocalStorage } from "./local";
import type { StorageProvider } from "./types";

export type { StorageProvider, StoredFile } from "./types";

let instance: StorageProvider | null = null;

/** Cloudinary when configured (production), otherwise the local `uploads/` folder (development). */
export function getStorage(): StorageProvider {
  if (!instance) instance = env.storageDriver === "cloudinary" ? new CloudinaryStorage() : new LocalStorage();
  return instance;
}
