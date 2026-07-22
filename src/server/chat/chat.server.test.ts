import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_GEMINI_MODEL,
  type Conversation,
  type CreateMessageInput,
  type GeminiModel,
  type Message,
} from "../../contracts";
import type { GeminiHistoryMessage } from "../gemini/gemini.server";
import { createChatApi, type ChatStore } from "./chat.server";

class MemoryChatStore implements ChatStore {
  private conversations = new Map<string, Conversation & { userId: string }>();
  private messages = new Map<string, Message[]>();
  private sequence = 0;

  messageCount(conversationId: string) {
    return this.messages.get(conversationId)?.length ?? 0;
  }

  async listConversations(userId: string) {
    return [...this.conversations.values()]
      .filter((conversation) => conversation.userId === userId)
      .map(({ userId: _userId, ...conversation }) => conversation);
  }

  async createConversation(userId: string, title: string) {
    const now = new Date(Date.UTC(2026, 0, 1, 0, 0, this.sequence++)).toISOString();
    const conversation = {
      id: `conv_${this.sequence}`,
      userId,
      title,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(conversation.id, conversation);
    const { userId: _userId, ...result } = conversation;
    return result;
  }

  async getConversation(userId: string, id: string) {
    const conversation = this.conversations.get(id);
    if (!conversation || conversation.userId !== userId) return null;
    const { userId: _userId, ...result } = conversation;
    return result;
  }

  async renameConversation(userId: string, id: string, title: string) {
    const conversation = this.conversations.get(id);
    if (!conversation || conversation.userId !== userId) return null;
    conversation.title = title;
    conversation.updatedAt = new Date(Date.UTC(2026, 0, 2)).toISOString();
    const { userId: _userId, ...result } = conversation;
    return result;
  }

  async deleteConversation(userId: string, id: string) {
    const conversation = this.conversations.get(id);
    if (!conversation || conversation.userId !== userId) return false;
    this.conversations.delete(id);
    this.messages.delete(id);
    return true;
  }

  async listMessages(userId: string, conversationId: string) {
    if (!(await this.getConversation(userId, conversationId))) return null;
    return this.messages.get(conversationId) ?? [];
  }

  async createMessage(userId: string, conversationId: string, input: CreateMessageInput) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) return null;
    const message: Message = {
      id: `message_${++this.sequence}`,
      conversationId,
      role: input.role,
      content: input.content,
      createdAt: new Date(Date.UTC(2026, 0, 3, 0, 0, this.sequence)).toISOString(),
      status: "complete",
    };
    this.messages.set(conversationId, [...(this.messages.get(conversationId) ?? []), message]);
    if (input.role === "user" && conversation.title === "New conversation") {
      conversation.title = input.content.trim().slice(0, 60);
    }
    return message;
  }

  async getRecentMessages(userId: string, conversationId: string, limit: number) {
    const existing = await this.listMessages(userId, conversationId);
    return existing?.slice(-limit) ?? null;
  }

  async persistGeneratedMessages(
    userId: string,
    conversationId: string,
    userContent: string,
    assistantContent: string,
  ) {
    if (!(await this.getConversation(userId, conversationId))) return null;
    const user = await this.createMessage(userId, conversationId, {
      role: "user",
      content: userContent,
    });
    const assistant = await this.createMessage(userId, conversationId, {
      role: "assistant",
      content: assistantContent,
    });
    if (!user || !assistant) return null;
    return { user, assistant };
  }

  async replaceAssistantMessage(
    userId: string,
    conversationId: string,
    assistantMessageId: string,
    assistantContent: string,
  ) {
    if (!(await this.getConversation(userId, conversationId))) return null;
    const existing = this.messages.get(conversationId) ?? [];
    const assistant = existing.find(
      (message) => message.id === assistantMessageId && message.role === "assistant",
    );
    if (!assistant) return null;
    assistant.content = assistantContent;
    return assistant;
  }
}

function request(method: string, path: string, userId?: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      ...(userId ? { "x-test-user": userId } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function setup(
  generate: (
    history: GeminiHistoryMessage[],
    message: string,
    model: GeminiModel,
  ) => Promise<string> = async () => "Generated response",
  model: GeminiModel = DEFAULT_GEMINI_MODEL,
) {
  const store = new MemoryChatStore();
  const resolveModel = vi.fn(async () => model);
  const api = createChatApi({
    store,
    resolveUserId: async (incoming) => incoming.headers.get("x-test-user"),
    resolveModel,
    generate,
    bodyLimitBytes: 16_384,
  });
  return { api, store, resolveModel };
}

describe("authenticated conversation API", () => {
  it("creates, lists, renames, and deletes conversations", async () => {
    const { api } = setup();
    const createdResponse = await api.conversations(
      request("POST", "/api/conversations", "user-a", { title: "First chat" }),
      "create",
    );
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as Conversation;

    const listed = await api.conversations(request("GET", "/api/conversations", "user-a"), "list");
    await expect(listed.json()).resolves.toEqual([created]);

    const renamed = await api.conversation(
      request("PATCH", `/api/conversations/${created.id}`, "user-a", { title: "Renamed" }),
      "rename",
      created.id,
    );
    await expect(renamed.json()).resolves.toMatchObject({ id: created.id, title: "Renamed" });

    const deleted = await api.conversation(
      request("DELETE", `/api/conversations/${created.id}`, "user-a"),
      "delete",
      created.id,
    );
    expect(deleted.status).toBe(204);
  });

  it("persists messages and removes them when their conversation is deleted", async () => {
    const { api, store } = setup();
    const created = (await (
      await api.conversations(request("POST", "/api/conversations", "user-a", {}), "create")
    ).json()) as Conversation;

    await api.conversationMessages(
      request("POST", `/api/conversations/${created.id}/messages`, "user-a", {
        role: "user",
        content: "Persist me",
      }),
      "message",
      created.id,
    );
    const listed = await api.conversationMessages(
      request("GET", `/api/conversations/${created.id}/messages`, "user-a"),
      "messages",
      created.id,
    );
    await expect(listed.json()).resolves.toEqual([
      expect.objectContaining({ conversationId: created.id, role: "user", content: "Persist me" }),
    ]);
    expect(store.messageCount(created.id)).toBe(1);

    await api.conversation(
      request("DELETE", `/api/conversations/${created.id}`, "user-a"),
      "delete",
      created.id,
    );
    expect(store.messageCount(created.id)).toBe(0);
  });

  it("rejects unauthenticated requests", async () => {
    const { api } = setup();
    const response = await api.conversations(request("GET", "/api/conversations"), "anonymous");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("returns 404 when one user attempts to access another user's chat", async () => {
    const { api } = setup();
    const created = (await (
      await api.conversations(
        request("POST", "/api/conversations", "user-b", { title: "Private" }),
        "create-b",
      )
    ).json()) as Conversation;

    const fetched = await api.conversation(
      request("GET", `/api/conversations/${created.id}`, "user-a"),
      "foreign",
      created.id,
    );
    expect(fetched.status).toBe(404);
    const messages = await api.conversationMessages(
      request("GET", `/api/conversations/${created.id}/messages`, "user-a"),
      "foreign-messages",
      created.id,
    );
    expect(messages.status).toBe(404);

    const listed = await api.conversations(
      request("GET", "/api/conversations", "user-a"),
      "list-a",
    );
    await expect(listed.json()).resolves.toEqual([]);
  });

  it("rejects unauthenticated generation requests", async () => {
    const { api } = setup();
    const response = await api.generation(
      request("POST", "/api/conversations/conv_1/generate", undefined, { message: "Hello" }),
      "anonymous-generation",
      "conv_1",
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("does not generate for a conversation owned by another user", async () => {
    const generate = vi.fn(async () => "Private response");
    const { api } = setup(generate);
    const created = (await (
      await api.conversations(
        request("POST", "/api/conversations", "user-b", { title: "Private" }),
        "create-b",
      )
    ).json()) as Conversation;

    const response = await api.generation(
      request("POST", `/api/conversations/${created.id}/generate`, "user-a", {
        message: "Do not answer",
      }),
      "foreign-generation",
      created.id,
    );
    expect(response.status).toBe(404);
    expect(generate).not.toHaveBeenCalled();
  });

  it("uses the latest 20 messages and persists the generated pair", async () => {
    const generate = vi.fn(
      async (_history: GeminiHistoryMessage[], _message: string) => "Gemini answer",
    );
    const { api, store, resolveModel } = setup(generate, "gemini-3.5-flash-lite");
    const created = (await (
      await api.conversations(request("POST", "/api/conversations", "user-a", {}), "create")
    ).json()) as Conversation;
    for (let index = 0; index < 21; index += 1) {
      await store.createMessage("user-a", created.id, {
        role: index % 2 === 0 ? "user" : "assistant",
        content: `History ${index}`,
      });
    }

    const response = await api.generation(
      request("POST", `/api/conversations/${created.id}/generate`, "user-a", {
        message: "New question",
      }),
      "generate",
      created.id,
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      user: { role: "user", content: "New question" },
      assistant: { role: "assistant", content: "Gemini answer" },
    });
    expect(generate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ content: "History 20" })]),
      "New question",
      "gemini-3.5-flash-lite",
    );
    expect(resolveModel).toHaveBeenCalledWith("user-a");
    expect(generate.mock.calls[0]?.[0]).toHaveLength(20);
    await expect(store.listMessages("user-a", created.id)).resolves.toHaveLength(23);
  });

  it("sets the title from the first prompt without overwriting it later", async () => {
    const { api } = setup();
    const created = (await (
      await api.conversations(request("POST", "/api/conversations", "user-a", {}), "create")
    ).json()) as Conversation;

    await api.generation(
      request("POST", `/api/conversations/${created.id}/generate`, "user-a", {
        message: "First prompt",
      }),
      "first-generation",
      created.id,
    );
    await api.generation(
      request("POST", `/api/conversations/${created.id}/generate`, "user-a", {
        message: "Second prompt",
      }),
      "second-generation",
      created.id,
    );

    const response = await api.conversation(
      request("GET", `/api/conversations/${created.id}`, "user-a"),
      "get-conversation",
      created.id,
    );
    await expect(response.json()).resolves.toMatchObject({ title: "First prompt" });
  });

  it("returns a controlled error and persists nothing when Gemini fails", async () => {
    const { api, store } = setup(async () => {
      throw new Error("provider detail must stay private");
    });
    const created = (await (
      await api.conversations(request("POST", "/api/conversations", "user-a", {}), "create")
    ).json()) as Conversation;

    const response = await api.generation(
      request("POST", `/api/conversations/${created.id}/generate`, "user-a", {
        message: "Question",
      }),
      "provider-failure",
      created.id,
    );
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Unable to generate a response. Please try again.",
      },
    });
    await expect(store.listMessages("user-a", created.id)).resolves.toEqual([]);
  });

  it("regenerates by replacing the latest assistant without duplicating the user", async () => {
    const generate = vi.fn(
      async (_history: GeminiHistoryMessage[], _message: string) => "Replacement answer",
    );
    const { api, store } = setup(generate);
    const created = (await (
      await api.conversations(request("POST", "/api/conversations", "user-a", {}), "create")
    ).json()) as Conversation;
    const user = await store.createMessage("user-a", created.id, {
      role: "user",
      content: "Original question",
    });
    const assistant = await store.createMessage("user-a", created.id, {
      role: "assistant",
      content: "Original answer",
    });

    const response = await api.regeneration(
      request("POST", `/api/conversations/${created.id}/regenerate`, "user-a"),
      "regenerate",
      created.id,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: { id: user?.id, content: "Original question" },
      assistant: { id: assistant?.id, content: "Replacement answer" },
    });
    expect(generate).toHaveBeenCalledWith([], "Original question", DEFAULT_GEMINI_MODEL);
    await expect(store.listMessages("user-a", created.id)).resolves.toHaveLength(2);
  });
});
