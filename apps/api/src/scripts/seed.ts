/**
 * Seeds the database:
 *   • an admin user (ADMIN_EMAIL / ADMIN_PASSWORD) and, in development, a demo user
 *   • the six poster templates, with thumbnails rendered from fictional demo content
 *
 *   npm run seed                 # idempotent — updates templates in place
 *   npm run seed -- --thumbs     # also re-render every thumbnail
 */
import { TEMPLATE_PRESETS } from "@poster/shared";
import { connectDb, disconnectDb } from "../config/db";
import { env } from "../config/env";
import { hashPassword } from "../lib/auth";
import { logger } from "../lib/logger";
import { Template } from "../models/Template";
import { User } from "../models/User";
import { closeBrowser } from "../services/render/renderer";
import { renderTemplateThumbnail } from "../services/thumbnails";

const forceThumbs = process.argv.includes("--thumbs");

async function upsertUser(opts: { name: string; email: string; password: string; role: "admin" | "user" }) {
  const email = opts.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== opts.role) {
      existing.role = opts.role;
      await existing.save();
    }
    return { user: existing, created: false };
  }
  const user = await User.create({ name: opts.name, email, passwordHash: await hashPassword(opts.password), role: opts.role });
  return { user, created: true };
}

async function main() {
  await connectDb();

  const admin = await upsertUser({ name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, role: "admin" });
  logger.info(`admin ${admin.created ? "created" : "already exists"}: ${env.ADMIN_EMAIL}${admin.created && !env.isProd ? `  (password: ${env.ADMIN_PASSWORD})` : ""}`);
  if (!env.isProd) {
    const demo = await upsertUser({ name: "Demo User", email: "demo@poster.local", password: "Demo@12345", role: "user" });
    logger.info(`demo user ${demo.created ? "created" : "already exists"}: demo@poster.local  (password: Demo@12345)`);
  }

  for (const preset of TEMPLATE_PRESETS) {
    const existing = await Template.findOne({ slug: preset.slug });
    const fields = {
      title: preset.title,
      titleBn: preset.titleBn,
      description: preset.description,
      occasionType: preset.occasionType,
      layoutConfig: preset.layoutConfig,
      sortOrder: preset.sortOrder,
      isActive: existing?.isActive ?? true,
    };
    let thumbnailUrl = existing?.thumbnailUrl ?? "";
    if (!thumbnailUrl || forceThumbs) {
      thumbnailUrl = await renderTemplateThumbnail({ slug: preset.slug, layout: preset.layoutConfig, occasion: preset.occasionType });
    }
    await Template.updateOne({ slug: preset.slug }, { $set: { ...fields, thumbnailUrl }, $setOnInsert: { usageCount: 0 } }, { upsert: true });
    logger.info(`template ${existing ? "updated" : "created"}: ${preset.slug} — ${preset.titleBn}`);
  }

  logger.info("seed complete ✔");
}

main()
  .catch((err) => {
    logger.error({ err }, "seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeBrowser();
    await disconnectDb();
  });
