import { mockDelay, mockId, mockMessages, mockResponseTokens } from "@/mocks/mock-data";
import { touchMockConversation } from "../conversations/mock-conversation.service";
import type { ChatService, Message, SendMessageInput, StreamChunk } from "./chat.types";

const STORAGE_KEY = "aster.messages.v1";

function loadAll(): Record<string, Message[]> {
  if (typeof window === "undefined") return { ...mockMessages };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockMessages));
      return { ...mockMessages };
    }
    return JSON.parse(raw) as Record<string, Message[]>;
  } catch {
    return { ...mockMessages };
  }
}

function saveAll(map: Record<string, Message[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function push(conversationId: string, message: Message) {
  const map = loadAll();
  map[conversationId] = [...(map[conversationId] ?? []), message];
  saveAll(map);
}

const abortFlags = new Map<string, boolean>();

function streamTokens(conversationId: string, tokens: string[]): AsyncIterable<StreamChunk> {
  abortFlags.set(conversationId, false);
  async function* run(): AsyncIterable<StreamChunk> {
    await mockDelay(250, 500); // "thinking"
    const assistantId = mockId("m");
    let accumulated = "";
    for (const token of tokens) {
      if (abortFlags.get(conversationId)) break;
      await mockDelay(15, 60);
      accumulated += token;
      yield { delta: token };
    }
    const assistantMsg: Message = {
      id: assistantId,
      conversationId,
      role: "assistant",
      content: accumulated,
      createdAt: new Date().toISOString(),
      status: "complete",
    };
    push(conversationId, assistantMsg);
    touchMockConversation(conversationId);
    yield { done: true };
  }
  return run();
}

export const mockChatService: ChatService = {
  async getMessages(conversationId: string) {
    await mockDelay(100, 300);
    return loadAll()[conversationId] ?? [];
  },

  sendMessage({ conversationId, content }: SendMessageInput) {
    const userMsg: Message = {
      id: mockId("m"),
      conversationId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      status: "complete",
    };
    push(conversationId, userMsg);
    touchMockConversation(conversationId, content.length > 0 ? content.slice(0, 60) : undefined);
    return streamTokens(conversationId, mockResponseTokens(content));
  },

  async stopGeneration(conversationId: string) {
    abortFlags.set(conversationId, true);
  },

  regenerateResponse(conversationId: string) {
    const messages = loadAll()[conversationId] ?? [];
    // Drop the last assistant message so the new one replaces it.
    const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === "assistant");
    if (lastAssistantIdx !== -1) {
      const idx = messages.length - 1 - lastAssistantIdx;
      const trimmed = messages.slice(0, idx);
      const map = loadAll();
      map[conversationId] = trimmed;
      saveAll(map);
    }
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return streamTokens(conversationId, mockResponseTokens(lastUser?.content ?? ""));
  },
};
