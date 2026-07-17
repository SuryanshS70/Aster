import {
  conversationIdSchema,
  generateMessageResponseSchema,
  messageListSchema,
  sendMessageInputSchema,
} from "@/contracts";
import type { ChatService, StreamChunk } from "./chat.types";

const generationControllers = new Map<string, AbortController>();

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: "same-origin" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Messages are temporarily unavailable. Please try again.");
  }
  if (!response.ok) {
    throw new Error(
      response.status === 502
        ? "Unable to generate a response. Please try again."
        : "Unable to update messages. Please try again.",
    );
  }
  return response.json();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export const chatService: ChatService = {
  async getMessages(rawConversationId) {
    const conversationId = conversationIdSchema.parse(rawConversationId);
    return messageListSchema.parse(
      await request(`/api/conversations/${encodeURIComponent(conversationId)}/messages`),
    );
  },

  sendMessage(input) {
    const validated = sendMessageInputSchema.parse(input);
    const controller = new AbortController();
    generationControllers.get(validated.conversationId)?.abort();
    generationControllers.set(validated.conversationId, controller);

    async function* run(): AsyncIterable<StreamChunk> {
      try {
        const response = generateMessageResponseSchema.parse(
          await request(
            `/api/conversations/${encodeURIComponent(validated.conversationId)}/generate`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ message: validated.content }),
              signal: controller.signal,
            },
          ),
        );
        yield { delta: response.assistant.content };
        yield { done: true };
      } catch (error) {
        if (!isAbortError(error)) throw error;
      } finally {
        if (generationControllers.get(validated.conversationId) === controller) {
          generationControllers.delete(validated.conversationId);
        }
      }
    }
    return run();
  },

  async stopGeneration(conversationId) {
    generationControllers.get(conversationIdSchema.parse(conversationId))?.abort();
  },

  regenerateResponse(conversationId) {
    conversationIdSchema.parse(conversationId);
    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<StreamChunk>> {
            throw new Error("Response regeneration is not available yet.");
          },
        };
      },
    };
  },
};
