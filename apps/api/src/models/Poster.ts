import { model, Schema, type HydratedDocument, type InferSchemaType } from "mongoose";
import { POSTER_STAGES } from "@poster/shared";

const versionSchema = new Schema(
  {
    variant: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    previewUrl: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    scheme: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const posterSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: "Template", required: true, index: true },
    /** everything the user typed / picked (validated by posterFormSchema) */
    formData: { type: Schema.Types.Mixed, required: true },
    uploadedPhotoUrls: { type: [String], default: [] },
    /** per-photo facts captured at upload time (transparency → cut-out style) */
    photoMeta: { type: [new Schema({ url: String, hasAlpha: Boolean, width: Number, height: Number }, { _id: false })], default: [] },
    status: { type: String, enum: ["draft", "generating", "completed", "failed"], default: "draft", index: true },
    progress: {
      stage: { type: String, enum: POSTER_STAGES, default: "queued" },
      pct: { type: Number, default: 0 },
    },
    generatedImageUrl: { type: String },
    previewImageUrl: { type: String },
    width: { type: Number },
    height: { type: Number },
    variant: { type: Number, default: 0 },
    regenCount: { type: Number, default: 0 },
    /** the art direction (Gemini or fallback) behind the current version */
    scheme: { type: Schema.Types.Mixed },
    /** template layout at generation time — lets us re-render (PDF) exactly, even if the template is edited later */
    layoutSnapshot: { type: Schema.Types.Mixed },
    versions: { type: [versionSchema], default: [] },
    selectedVersion: { type: Schema.Types.ObjectId },
    error: { type: String },
    consentAt: { type: Date },
    moderation: {
      status: { type: String, enum: ["clean", "flagged", "blocked"], default: "clean", index: true },
      reasons: { type: [String], default: [] },
      note: { type: String },
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
    },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

posterSchema.index({ userId: 1, createdAt: -1 });
posterSchema.index({ status: 1, createdAt: -1 });

export type PosterAttrs = InferSchemaType<typeof posterSchema>;
export type PosterDoc = HydratedDocument<PosterAttrs>;
export const Poster = model("Poster", posterSchema);
