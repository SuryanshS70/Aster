import { z } from "zod";

export const GEMINI_MODEL_IDS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
] as const;

export const DEFAULT_GEMINI_MODEL = GEMINI_MODEL_IDS[0];

export const geminiModelSchema = z.enum(GEMINI_MODEL_IDS);

export const modelPreferenceSchema = z
  .object({
    model: geminiModelSchema,
  })
  .strict();

export const GEMINI_MODEL_OPTIONS = [
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    description: "The default choice with a strong balance of speed and response quality.",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    description: "A lighter option for quick questions and straightforward everyday tasks.",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    description: "A lightweight previous-generation option for simple responses.",
  },
] as const satisfies ReadonlyArray<{
  id: GeminiModel;
  name: string;
  description: string;
}>;

export type GeminiModel = z.infer<typeof geminiModelSchema>;
export type ModelPreference = z.infer<typeof modelPreferenceSchema>;
