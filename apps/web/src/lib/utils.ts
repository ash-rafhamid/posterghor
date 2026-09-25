import clsx, { type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]): string => clsx(inputs);

export function formatDate(iso: string | undefined, lang: "en" | "bn" = "en"): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(iso: string | undefined, lang: "en" | "bn" = "en"): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Saves a Blob as a file download. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function bytesToHuman(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** A short random id for client-side list keys. */
export const uid = (): string => Math.random().toString(36).slice(2, 10);
