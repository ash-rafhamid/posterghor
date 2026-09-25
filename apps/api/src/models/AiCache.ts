import { model, Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * Cache for AI outputs that are safe to share between users: template-level colour schemes, backdrop plates,
 * per-photo focal points, headline suggestions. This is the "cost control" the brief asks for — the same
 * template + variant never pays for Gemini twice.
 */
const cacheSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    kind: { type: String, enum: ["scheme", "focus", "backdrop", "suggest"], required: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    model: { type: String, default: "" },
    tokens: { type: Number, default: 0 },
    hits: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
  },
  { versionKey: false },
);

export type AiCacheAttrs = InferSchemaType<typeof cacheSchema>;
export type AiCacheDoc = HydratedDocument<AiCacheAttrs>;
export const AiCache = model("AiCache", cacheSchema);
