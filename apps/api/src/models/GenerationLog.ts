import { model, Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

/** One row per generation attempt — AI cost tracking + render performance. */
const logSchema = new Schema(
  {
    posterId: { type: Schema.Types.ObjectId, ref: "Poster", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    templateId: { type: Schema.Types.ObjectId, ref: "Template" },
    model: { type: String, default: "" },
    /** the prompt sent to Gemini (truncated) */
    promptUsed: { type: String, default: "", maxlength: 4000 },
    tokensUsed: { type: Number, default: 0 },
    promptTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    /** Gemini round-trip time (0 when fully served from cache / fallback) */
    latencyMs: { type: Number, default: 0 },
    /** Puppeteer render + encode time */
    renderMs: { type: Number, default: 0 },
    totalMs: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
    cacheHit: { type: Boolean, default: false },
    source: { type: String, enum: ["gemini", "fallback"], default: "fallback" },
    error: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

logSchema.index({ createdAt: -1 });

export type GenerationLogAttrs = InferSchemaType<typeof logSchema>;
export type GenerationLogDoc = HydratedDocument<GenerationLogAttrs>;
export const GenerationLog = model("GenerationLog", logSchema);
