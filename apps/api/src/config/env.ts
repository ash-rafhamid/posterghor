import "dotenv/config";
import { z } from "zod";

/**
 * Environment configuration — validated once at boot. Everything optional has a safe development default so the
 * project runs with zero setup (embedded MongoDB, local file storage, deterministic art-direction fallback).
 */

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : ["1", "true", "yes", "on"].includes(v.toLowerCase())));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.string().default("info"),

  /** Public origin of this API (used to build URLs for locally stored files). */
  PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),

  /** Empty → embedded MongoDB in development (data persisted under apps/api/.data). */
  MONGODB_URI: z.string().optional(),
  MONGODB_DB: z.string().default("poster_maker"),

  JWT_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // ── file storage ──────────────────────────────────────────────────────────
  STORAGE_DRIVER: z.enum(["auto", "local", "cloudinary"]).default("auto"),
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("poster-maker"),

  // ── Gemini ────────────────────────────────────────────────────────────────
  GEMINI_API_KEY: z.string().optional(),
  /** Override the API endpoint (corporate proxy, or the local fake server used by `npm run test:gemini`). */
  GEMINI_BASE_URL: z.string().url().optional(),
  /** "-latest" aliases follow Google's newest stable Flash model. */
  GEMINI_TEXT_MODEL: z.string().default("gemini-flash-latest"),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-3.1-flash-image"),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  /** Paint an AI background plate per template variant (cached). Off by default — costs an image call once. */
  AI_BACKDROPS_ENABLED: bool(false),

  // ── product limits ────────────────────────────────────────────────────────
  MAX_REGENERATIONS: z.coerce.number().int().min(0).max(20).default(3),
  DAILY_POSTER_LIMIT: z.coerce.number().int().positive().default(60),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(12),
  /** Fixed UTC offset ("+06:00" = Bangladesh) used to group the admin dashboard's "today" / per-day numbers. */
  STATS_TZ_OFFSET: z
    .string()
    .regex(/^[+-]\d{2}:\d{2}$/, "use the form +06:00")
    .default("+06:00"),

  // ── rendering ─────────────────────────────────────────────────────────────
  RENDER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  /** Trade a little speed for a much smaller memory footprint (Chrome restarts after each poster). Default: on in production. */
  RENDER_LOW_MEMORY: z.enum(["true", "false"]).optional(),
  /** Path to Chrome/Chromium/Edge. Empty → Puppeteer's bundled Chrome, then well-known system locations. */
  CHROME_PATH: z.string().optional(),

  // ── seed ──────────────────────────────────────────────────────────────────
  ADMIN_NAME: z.string().default("Poster Admin"),
  ADMIN_EMAIL: z.string().default("admin@poster.local"),
  ADMIN_PASSWORD: z.string().default("Admin@12345"),
});

// `KEY=` lines in a copied .env.example are empty strings — treat them as "not set" so defaults apply.
const provided = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ""));
const parsed = schema.safeParse(provided);
if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
  console.error(`\nInvalid environment configuration:\n${msg}\n`);
  process.exit(1);
}

const raw = parsed.data;
const isProd = raw.NODE_ENV === "production";

if (isProd && !raw.JWT_SECRET) {
  console.error("\nJWT_SECRET is required in production (min 16 chars).\n");
  process.exit(1);
}
if (isProd && !raw.MONGODB_URI) {
  console.error("\nMONGODB_URI is required in production.\n");
  process.exit(1);
}

const cloudinaryConfigured = Boolean(raw.CLOUDINARY_URL || (raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET));

export const env = {
  ...raw,
  isProd,
  JWT_SECRET: raw.JWT_SECRET ?? "dev-only-insecure-secret-change-me-please",
  corsOrigins: raw.CORS_ORIGINS.split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
  publicApiUrl: raw.PUBLIC_API_URL.replace(/\/$/, ""),
  storageDriver: (raw.STORAGE_DRIVER === "auto" ? (cloudinaryConfigured ? "cloudinary" : "local") : raw.STORAGE_DRIVER) as "local" | "cloudinary",
  lowMemory: raw.RENDER_LOW_MEMORY ? raw.RENDER_LOW_MEMORY === "true" : isProd,
  geminiEnabled: Boolean(raw.GEMINI_API_KEY),
  maxUploadBytes: Math.round(raw.MAX_UPLOAD_MB * 1024 * 1024),
} as const;

export type Env = typeof env;
