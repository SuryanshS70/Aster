import { describe, expect, it } from "vitest";

import type { Conversation, CreateMessageInput, Message } from "../../contracts";
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
    if (!(await this.getConversation(userId, conversationId))) return null;
    const message: Message = {
      id: `message_${++this.sequence}`,
      conversationId,
      role: input.role,
      content: input.content,
      createdAt: new Date(Date.UTC(2026, 0, 3, 0, 0, this.sequence)).toISOString(),
      status: "complete",
    };
    this.messages.set(conversationId, [...(this.messages.get(conversationId) ?? []), message]);
    return message;
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

function setup() {
  const store = new MemoryChatStore();
  const api = createChatApi({
    store,
    resolveUserId: async (incoming) => incoming.headers.get("x-test-user"),
    bodyLimitBytes: 16_384,
  });
  return { api, store };
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
});
