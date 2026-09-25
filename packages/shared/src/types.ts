import type { OccasionId, PosterStage } from "./constants";
import type { PosterFormData } from "./schemas";
import type { LayoutConfig, PosterScheme } from "./poster/types";

/** JSON shapes returned by the API (ids are strings, dates are ISO strings). */

export type Role = "user" | "admin";
export type PosterStatus = "draft" | "generating" | "completed" | "failed";
export type ModerationStatus = "clean" | "flagged" | "blocked";

export interface ApiUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: Role;
  createdAt: string;
}

export interface ApiTemplate {
  id: string;
  slug: string;
  title: string;
  titleBn: string;
  description: string;
  occasionType: OccasionId;
  thumbnailUrl?: string;
  layoutConfig: LayoutConfig;
  isActive: boolean;
  sortOrder: number;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPosterVersion {
  id: string;
  variant: number;
  imageUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  scheme?: PosterScheme;
  createdAt: string;
}

export interface ApiPoster {
  id: string;
  userId: string;
  templateId: string;
  template?: Pick<ApiTemplate, "id" | "slug" | "title" | "titleBn" | "occasionType" | "thumbnailUrl">;
  formData: PosterFormData;
  uploadedPhotoUrls: string[];
  status: PosterStatus;
  progress: { stage: PosterStage; pct: number };
  /** print-resolution master (PNG) */
  generatedImageUrl?: string;
  /** lightweight JPG for grids / preview */
  previewImageUrl?: string;
  width?: number;
  height?: number;
  variant: number;
  regenCount: number;
  regenLimit: number;
  regenRemaining: number;
  scheme?: PosterScheme;
  versions: ApiPosterVersion[];
  selectedVersion?: string;
  error?: string;
  moderation: { status: ModerationStatus; reasons: string[]; note?: string };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  /** owner (admin views only) */
  owner?: Pick<ApiUser, "id" | "name" | "email" | "phone">;
}

export interface ApiUpload {
  url: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  bytes: number;
}

export interface ApiGenerationLog {
  id: string;
  posterId: string;
  model: string;
  promptUsed: string;
  tokensUsed: number;
  latencyMs: number;
  renderMs?: number;
  success: boolean;
  cacheHit: boolean;
  source: "gemini" | "fallback";
  error?: string;
  createdAt: string;
}

export interface ApiAdminStats {
  users: number;
  posters: number;
  postersToday: number;
  completed: number;
  failed: number;
  flagged: number;
  activeTemplates: number;
  avgLatencyMs: number;
  avgRenderMs: number;
  totalTokens: number;
  geminiCalls: number;
  cacheHits: number;
  byOccasion: Array<{ occasion: OccasionId; count: number }>;
  daily: Array<{ date: string; count: number }>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  message: string;
  code?: string;
  details?: unknown;
}
