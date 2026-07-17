import { GoogleGenAI } from "@google/genai";

import type { Message } from "../../contracts";
import { getGeminiConfig, type GeminiConfig } from "../config/env.server";

const systemInstruction =
  "You are Aster, a helpful general-purpose assistant. Be clear, accurate, and concise.";

export type GeminiHistoryMessage = Pick<Message, "role" | "content">;

export interface GeminiProvider {
  generate(history: GeminiHistoryMessage[], message: string): Promise<string>;
}

export function createGeminiProvider(config: GeminiConfig = getGeminiConfig()): GeminiProvider {
  const client = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    async generate(history, message) {
      const response = await client.models.generateContent({
        model: config.model,
        contents: [
          ...history.map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content }],
          })),
          { role: "user", parts: [{ text: message }] },
        ],
        config: { systemInstruction },
      });
      const text = response.text?.trim();
      if (!text) throw new Error("Gemini returned an empty response");
      return text;
    },
  };
}
