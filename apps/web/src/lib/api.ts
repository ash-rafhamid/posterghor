import type {
  ApiAdminStats,
  ApiGenerationLog,
  ApiPoster,
  ApiTemplate,
  ApiUpload,
  ApiUser,
  CreatePosterInput,
  ExportFormat,
  ModerationActionInput,
  OccasionId,
  Paginated,
  PosterStatus,
  TemplateInput,
} from "@poster/shared";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/* ── token storage (localStorage, always try/catch: private windows can throw) ── */
const TOKEN_KEY = "pg_token";
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

/** Fired when any authenticated request comes back 401 (expired / revoked token). */
export const authEvents = typeof window === "undefined" ? null : new EventTarget();

interface ReqOpts {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  signal?: AbortSignal;
  blob?: boolean;
}

async function request<T>(path: string, opts: ReqOpts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = opts.auth === false ? null : tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: opts.method ?? "GET", headers, body, signal: opts.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "NETWORK", "NETWORK");
  }

  if (!res.ok) {
    let data: { message?: string; code?: string; details?: unknown } = {};
    try {
      data = await res.json();
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401 && token) authEvents?.dispatchEvent(new Event("unauthorized"));
    throw new ApiError(res.status, data.message ?? `Request failed (${res.status})`, data.code, data.details);
  }
  if (res.status === 204) return undefined as T;
  if (opts.blob) return (await res.blob()) as T;
  return (await res.json()) as T;
}

const qs = (params: Record<string, string | number | boolean | undefined>): string => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : "";
};

export interface AppConfig {
  ai: { gemini: boolean; textModel: string | null; backdrops: boolean };
  limits: { maxRegenerations: number; maxUploadMb: number; maxPhotos: number; dailyPosters: number; bulkMaxRows: number };
  storage: "local" | "cloudinary";
}

export interface TextSuggestions {
  headlines: string[];
  subheadlines: string[];
  source: "gemini" | "curated";
}

export type AdminUser = ApiUser & { blocked: boolean; posterCount: number };

export const api = {
  config: () => request<AppConfig>("/api/config", { auth: false }),

  auth: {
    register: (body: { name: string; identifier: string; password: string }) => request<{ user: ApiUser; token: string }>("/api/auth/register", { method: "POST", body, auth: false }),
    login: (body: { identifier: string; password: string }) => request<{ user: ApiUser; token: string }>("/api/auth/login", { method: "POST", body, auth: false }),
    me: () => request<{ user: ApiUser }>("/api/auth/me"),
  },

  templates: {
    list: (occasion?: OccasionId) => request<{ items: ApiTemplate[] }>(`/api/templates${qs({ occasion })}`, { auth: false }),
    get: (idOrSlug: string) => request<{ template: ApiTemplate }>(`/api/templates/${encodeURIComponent(idOrSlug)}`, { auth: false }),
  },

  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ApiUpload & { lowRes: boolean }>("/api/upload", { method: "POST", form });
  },

  posters: {
    list: (params: { status?: PosterStatus; page?: number; pageSize?: number } = {}) => request<Paginated<ApiPoster>>(`/api/posters${qs(params)}`),
    get: (id: string, signal?: AbortSignal) => request<{ poster: ApiPoster }>(`/api/posters/${id}`, { signal }),
    create: (body: CreatePosterInput | Record<string, unknown>) => request<{ poster: ApiPoster }>("/api/posters", { method: "POST", body }),
    regenerate: (id: string, body: { formData?: Record<string, unknown>; keepStyle?: boolean }) =>
      request<{ poster: ApiPoster }>(`/api/posters/${id}/regenerate`, { method: "POST", body }),
    selectVersion: (id: string, versionId: string) => request<{ poster: ApiPoster }>(`/api/posters/${id}/version`, { method: "PATCH", body: { versionId } }),
    remove: (id: string) => request<void>(`/api/posters/${id}`, { method: "DELETE" }),
    bulk: (body: { templateId: string; consent: true; base: Record<string, unknown>; rows: Array<Record<string, string | undefined>> }) =>
      request<{ posters: ApiPoster[]; skipped: Array<{ row: number; reason: string }> }>("/api/posters/bulk", { method: "POST", body }),
    batch: (ids: string[], signal?: AbortSignal) => request<{ items: ApiPoster[] }>(`/api/posters/batch${qs({ ids: ids.join(",") })}`, { signal }),
    zip: (ids: string[], format: "png" | "jpg") => request<Blob>(`/api/posters/bulk/zip${qs({ ids: ids.join(","), format })}`, { blob: true }),
    download: (id: string, format: ExportFormat, version?: string) => request<Blob>(`/api/posters/${id}/download${qs({ format, version })}`, { blob: true }),
  },

  ai: {
    suggest: (occasion: OccasionId, tone?: string) => request<TextSuggestions>("/api/ai/suggest", { method: "POST", body: { occasion, tone } }),
  },

  admin: {
    stats: () => request<ApiAdminStats>("/api/admin/stats"),
    posters: (params: { status?: PosterStatus; moderation?: string; q?: string; page?: number; pageSize?: number } = {}) =>
      request<Paginated<ApiPoster>>(`/api/admin/posters${qs(params)}`),
    moderate: (id: string, body: ModerationActionInput) => request<{ poster: ApiPoster }>(`/api/admin/posters/${id}/moderation`, { method: "PATCH", body }),
    logs: (params: { page?: number; pageSize?: number; failedOnly?: boolean } = {}) => request<Paginated<ApiGenerationLog>>(`/api/admin/logs${qs(params)}`),
    users: (params: { page?: number; pageSize?: number; q?: string } = {}) => request<Paginated<AdminUser>>(`/api/admin/users${qs(params)}`),
    updateUser: (id: string, body: { blocked?: boolean; role?: "user" | "admin" }) => request<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", body }),
    templates: () => request<{ items: ApiTemplate[] }>("/api/admin/templates"),
    createTemplate: (body: TemplateInput) => request<{ template: ApiTemplate }>("/api/admin/templates", { method: "POST", body }),
    updateTemplate: (id: string, body: Partial<TemplateInput>) => request<{ template: ApiTemplate }>(`/api/admin/templates/${id}`, { method: "PATCH", body }),
    rethumb: (id: string) => request<{ template: ApiTemplate }>(`/api/admin/templates/${id}/thumbnail`, { method: "POST" }),
    deleteTemplate: (id: string) => request<{ deleted: boolean; deactivated: boolean }>(`/api/admin/templates/${id}`, { method: "DELETE" }),
  },
};
