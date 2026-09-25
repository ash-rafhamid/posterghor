import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

/**
 * Thin wrapper around @google/genai. Everything AI-related goes through here so that:
 *  - the rest of the app never touches the SDK (easy to swap / mock),
 *  - every call reports token usage + latency (feeds GenerationLog for cost tracking),
 *  - failures surface as plain Errors that callers turn into a graceful fallback.
 */

let client: GoogleGenAI | null = null;
const getClient = (): GoogleGenAI =>
  (client ??= new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    ...(env.GEMINI_BASE_URL ? { httpOptions: { baseUrl: env.GEMINI_BASE_URL } } : {}),
  }));

export const geminiEnabled = (): boolean => env.geminiEnabled;

export interface AiUsage {
  total: number;
  prompt: number;
  output: number;
}

export const emptyUsage = (): AiUsage => ({ total: 0, prompt: 0, output: 0 });
export const addUsage = (a: AiUsage, b: AiUsage): AiUsage => ({ total: a.total + b.total, prompt: a.prompt + b.prompt, output: a.output + b.output });

export interface JsonResult {
  data: unknown;
  usage: AiUsage;
  latencyMs: number;
  model: string;
}

function usageOf(res: { usageMetadata?: { totalTokenCount?: number; promptTokenCount?: number; candidatesTokenCount?: number } }): AiUsage {
  const u = res.usageMetadata;
  return { total: u?.totalTokenCount ?? 0, prompt: u?.promptTokenCount ?? 0, output: u?.candidatesTokenCount ?? 0 };
}

/** Models sometimes wrap JSON in ```fences``` even in JSON mode — be forgiving. */
function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(t);
}

const isConfigError = (e: unknown) => /thinking|unsupported|invalid.*argument|not supported/i.test(e instanceof Error ? e.message : String(e));

/** Structured JSON generation (text and/or images in, JSON out). */
export async function generateJson(opts: {
  system: string;
  parts: Part[];
  schema: unknown;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}): Promise<JsonResult> {
  const ai = getClient();
  const model = opts.model ?? env.GEMINI_TEXT_MODEL;
  const t0 = Date.now();
  const base = {
    systemInstruction: opts.system,
    responseMimeType: "application/json",
    responseJsonSchema: opts.schema,
    temperature: opts.temperature ?? 0.8,
    maxOutputTokens: opts.maxOutputTokens ?? 2048,
  };
  const call = (withThinking: boolean) =>
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: opts.parts }],
      config: {
        ...base,
        ...(withThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } : {}),
        abortSignal: AbortSignal.timeout(env.GEMINI_TIMEOUT_MS),
      },
    });

  let res;
  try {
    res = await call(true);
  } catch (e) {
    // Older / different model families reject the thinking hint — retry once without it.
    if (!isConfigError(e)) throw e;
    logger.debug({ err: e }, "gemini: retrying without thinkingConfig");
    res = await call(false);
  }
  const text = res.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return { data: parseJson(text), usage: usageOf(res), latencyMs: Date.now() - t0, model };
}

export interface ImageResult {
  buffer: Buffer;
  mimeType: string;
  usage: AiUsage;
  latencyMs: number;
  model: string;
}

/** Image generation (used for cached, template-level background plates only). */
export async function generateImage(opts: { prompt: string; aspectRatio?: string; imageSize?: string }): Promise<ImageResult> {
  const ai = getClient();
  const model = env.GEMINI_IMAGE_MODEL;
  const t0 = Date.now();
  const call = (modalities: string[]) =>
    ai.models.generateContent({
      model,
      contents: opts.prompt,
      config: {
        responseModalities: modalities,
        imageConfig: { aspectRatio: opts.aspectRatio ?? "3:4", imageSize: opts.imageSize ?? "1K" },
        abortSignal: AbortSignal.timeout(Math.max(env.GEMINI_TIMEOUT_MS, 90_000)),
      },
    });
  let res;
  try {
    res = await call(["TEXT", "IMAGE"]);
  } catch (e) {
    if (!isConfigError(e)) throw e;
    res = await call(["IMAGE"]);
  }
  const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error("Gemini returned no image");
  return {
    buffer: Buffer.from(part.inlineData.data, "base64"),
    mimeType: part.inlineData.mimeType ?? "image/png",
    usage: usageOf(res),
    latencyMs: Date.now() - t0,
    model,
  };
}
