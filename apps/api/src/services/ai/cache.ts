import { AiCache } from "../../models/AiCache";

type Kind = "scheme" | "focus" | "backdrop" | "suggest";

/** Reads a cached AI result (and counts the hit). */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const doc = await AiCache.findOneAndUpdate({ key }, { $inc: { hits: 1 } }, { returnDocument: "after" }).lean();
  return (doc?.value as T | undefined) ?? null;
}

export async function cacheSet(kind: Kind, key: string, value: unknown, meta: { model?: string; tokens?: number } = {}): Promise<void> {
  await AiCache.updateOne(
    { key },
    { $set: { kind, value, model: meta.model ?? "", tokens: meta.tokens ?? 0 }, $setOnInsert: { createdAt: new Date(), hits: 0 } },
    { upsert: true },
  );
}

/** Values for all cache keys that start with `prefix` (used to show Gemini what earlier variants looked like). */
export async function cacheList<T>(prefix: string, limit = 6): Promise<T[]> {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const docs = await AiCache.find({ key: new RegExp(`^${escaped}`) }).sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map((d) => d.value as T);
}
