import { model, Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // unique + sparse: a user may have an email, a phone number or both
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    phone: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    blocked: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs>;
export const User = model("User", userSchema);
