import {
  conversationIdSchema,
  createMessageInputSchema,
  messageListSchema,
  messageSchema,
  sendMessageInputSchema,
} from "@/contracts";
import { mockDelay, mockResponseTokens } from "@/mocks/mock-data";
import type { ChatService, Message, StreamChunk } from "./chat.types";

const abortFlags = new Map<string, boolean>();

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: "same-origin" });
  } catch {
    throw new Error("Messages are temporarily unavailable. Please try again.");
  }
  if (!response.ok) throw new Error("Unable to update messages. Please try again.");
  return response.json();
}

async function createMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
): Promise<Message> {
  const input = createMessageInputSchema.parse({ role, content });
  return messageSchema.parse(
    await request(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

function streamSimulatedResponse(
  conversationId: string,
  prompt: string,
): AsyncIterable<StreamChunk> {
  abortFlags.set(conversationId, false);
  async function* run(): AsyncIterable<StreamChunk> {
    await mockDelay(250, 500);
    let accumulated = "";
    for (const token of mockResponseTokens(prompt)) {
      if (abortFlags.get(conversationId)) break;
      await mockDelay(15, 60);
      accumulated += token;
      yield { delta: token };
    }
    if (accumulated) await createMessage(conversationId, "assistant", accumulated);
    yield { done: true };
  }
  return run();
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
    async function* run(): AsyncIterable<StreamChunk> {
      await createMessage(validated.conversationId, "user", validated.content);
      for await (const chunk of streamSimulatedResponse(
        validated.conversationId,
        validated.content,
      )) {
        yield chunk;
      }
    }
    return run();
  },

  async stopGeneration(conversationId) {
    abortFlags.set(conversationIdSchema.parse(conversationId), true);
  },

  regenerateResponse(rawConversationId) {
    const conversationId = conversationIdSchema.parse(rawConversationId);
    async function* run(): AsyncIterable<StreamChunk> {
      const existing = await chatService.getMessages(conversationId);
      const lastUser = [...existing].reverse().find((message) => message.role === "user");
      for await (const chunk of streamSimulatedResponse(conversationId, lastUser?.content ?? "")) {
        yield chunk;
      }
    }
    return run();
  },
};
