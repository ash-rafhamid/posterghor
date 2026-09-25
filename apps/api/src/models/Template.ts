import { model, Schema, type HydratedDocument, type InferSchemaType } from "mongoose";
import { OCCASION_IDS } from "@poster/shared";

const templateSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    titleBn: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "", maxlength: 240 },
    occasionType: { type: String, enum: OCCASION_IDS, required: true, index: true },
    thumbnailUrl: { type: String, default: "" },
    /** photo slots, text slots, colour scheme, decorations — see LayoutConfig in @poster/shared */
    layoutConfig: { type: Schema.Types.Mixed, required: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 100 },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

templateSchema.index({ isActive: 1, occasionType: 1, sortOrder: 1 });

export type TemplateAttrs = InferSchemaType<typeof templateSchema>;
export type TemplateDoc = HydratedDocument<TemplateAttrs>;
export const Template = model("Template", templateSchema);
