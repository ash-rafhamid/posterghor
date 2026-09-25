export interface StoredFile {
  /** public URL */
  url: string;
  /** provider-specific key (path / public id) */
  key: string;
  bytes: number;
}

export interface StorageProvider {
  readonly name: "local" | "cloudinary";
  save(input: { buffer: Buffer; folder: string; filename: string; contentType: string }): Promise<StoredFile>;
  /** Reads a file back by the URL we issued. Throws if the URL is not ours. */
  read(url: string): Promise<Buffer>;
  delete(url: string): Promise<void>;
  /** True only for URLs this provider issued — the allow-list that protects against SSRF. */
  owns(url: string): boolean;
}
