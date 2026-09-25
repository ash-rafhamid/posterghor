import type { Types } from "mongoose";
import type { ApiPoster, ApiPosterVersion, ApiTemplate, ApiUser, LayoutConfig, PosterFormData, PosterScheme } from "@poster/shared";
import { env } from "./config/env";
import type { PosterAttrs } from "./models/Poster";
import type { TemplateAttrs } from "./models/Template";
import type { UserAttrs } from "./models/User";

type WithId<T> = T & { _id: Types.ObjectId | string; createdAt?: Date; updatedAt?: Date };

const iso = (d: Date | undefined) => (d ? new Date(d).toISOString() : new Date(0).toISOString());

export function toApiUser(u: WithId<Partial<UserAttrs>>): ApiUser {
  return {
    id: String(u._id),
    name: u.name ?? "",
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    role: (u.role ?? "user") as ApiUser["role"],
    createdAt: iso(u.createdAt),
  };
}

export function toApiTemplate(t: WithId<Partial<TemplateAttrs>>): ApiTemplate {
  return {
    id: String(t._id),
    slug: t.slug ?? "",
    title: t.title ?? "",
    titleBn: t.titleBn ?? "",
    description: t.description ?? "",
    occasionType: (t.occasionType ?? "victory") as ApiTemplate["occasionType"],
    thumbnailUrl: t.thumbnailUrl || undefined,
    layoutConfig: t.layoutConfig as LayoutConfig,
    isActive: t.isActive ?? true,
    sortOrder: t.sortOrder ?? 100,
    usageCount: t.usageCount ?? 0,
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
  };
}

export type TemplateBrief = Pick<ApiTemplate, "id" | "slug" | "title" | "titleBn" | "occasionType" | "thumbnailUrl">;

export function toTemplateBrief(t: WithId<Partial<TemplateAttrs>>): TemplateBrief {
  return {
    id: String(t._id),
    slug: t.slug ?? "",
    title: t.title ?? "",
    titleBn: t.titleBn ?? "",
    occasionType: (t.occasionType ?? "victory") as TemplateBrief["occasionType"],
    thumbnailUrl: t.thumbnailUrl || undefined,
  };
}

interface PosterExtras {
  template?: TemplateBrief;
  owner?: ApiPoster["owner"];
  /** admins see everything, including blocked posters' images */
  admin?: boolean;
}

export function toApiPoster(p: WithId<Partial<PosterAttrs>> & { versions?: PosterAttrs["versions"] }, extras: PosterExtras = {}): ApiPoster {
  const blocked = p.moderation?.status === "blocked" && !extras.admin;
  const versions: ApiPosterVersion[] = blocked
    ? []
    : (p.versions ?? []).map((v) => ({
        id: String((v as { _id?: unknown })._id),
        variant: v.variant,
        imageUrl: v.imageUrl,
        previewUrl: v.previewUrl,
        width: v.width,
        height: v.height,
        scheme: (v.scheme as PosterScheme | undefined) ?? undefined,
        createdAt: iso(v.createdAt as Date | undefined),
      }));
  const selected = versions.find((v) => v.id === String(p.selectedVersion)) ?? versions[versions.length - 1];
  const regenCount = p.regenCount ?? 0;

  return {
    id: String(p._id),
    userId: String(p.userId),
    templateId: String(p.templateId),
    template: extras.template,
    formData: p.formData as PosterFormData,
    uploadedPhotoUrls: p.uploadedPhotoUrls ?? [],
    status: (p.status ?? "draft") as ApiPoster["status"],
    progress: { stage: (p.progress?.stage ?? "queued") as ApiPoster["progress"]["stage"], pct: p.progress?.pct ?? 0 },
    generatedImageUrl: blocked ? undefined : (selected?.imageUrl ?? p.generatedImageUrl ?? undefined),
    previewImageUrl: blocked ? undefined : (selected?.previewUrl ?? p.previewImageUrl ?? undefined),
    width: selected?.width ?? p.width ?? undefined,
    height: selected?.height ?? p.height ?? undefined,
    variant: p.variant ?? 0,
    regenCount,
    regenLimit: env.MAX_REGENERATIONS,
    regenRemaining: Math.max(0, env.MAX_REGENERATIONS - regenCount),
    scheme: blocked ? undefined : (selected?.scheme ?? (p.scheme as PosterScheme | undefined)),
    versions,
    selectedVersion: selected?.id,
    error: p.error ?? undefined,
    moderation: {
      status: (p.moderation?.status ?? "clean") as ApiPoster["moderation"]["status"],
      reasons: p.moderation?.reasons ?? [],
      note: p.moderation?.note ?? undefined,
    },
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
    completedAt: p.completedAt ? iso(p.completedAt) : undefined,
    owner: extras.owner,
  };
}
