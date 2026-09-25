import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { OCCASION_IDS } from "@poster/shared";
import { notFound } from "../lib/errors";
import { validate } from "../middleware/validate";
import { Template } from "../models/Template";
import { toApiTemplate } from "../serializers";

export const templatesRouter = Router();

const listQuery = z.object({ occasion: z.enum(OCCASION_IDS).optional() });

/** GET /api/templates?occasion=victory — active templates, ordered for display. */
templatesRouter.get("/", validate(listQuery, "query"), async (req, res) => {
  const { occasion } = req.query as z.infer<typeof listQuery>;
  const docs = await Template.find({ isActive: true, ...(occasion ? { occasionType: occasion } : {}) })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
  res.set("Cache-Control", "public, max-age=30");
  res.json({ items: docs.map(toApiTemplate) });
});

/** GET /api/templates/:id — by ObjectId or slug. */
templatesRouter.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  const doc = await Template.findOne(mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id }).lean();
  if (!doc || !doc.isActive) throw notFound("Template not found");
  res.set("Cache-Control", "public, max-age=30");
  res.json({ template: toApiTemplate(doc) });
});
