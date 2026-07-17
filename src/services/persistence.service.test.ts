import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/mocks/mock-data", () => ({
  mockDelay: async () => undefined,
  mockResponseTokens: () => ["Simulated", " response"],
}));

import { chatService } from "./chat/chat.service";
import { conversationService } from "./conversations/conversation.service";

const conversation = {
  id: "conv_1",
  title: "Test chat",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function message(role: "user" | "assistant", content: string) {
  return {
    id: `message_${role}`,
    conversationId: conversation.id,
    role,
    content,
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "complete" as const,
  };
}

describe("persistent frontend service mapping", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("maps conversation CRUD to the authenticated API", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([conversation]))
      .mockResolvedValueOnce(Response.json(conversation, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ ...conversation, title: "Renamed" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await conversationService.getConversations();
    await conversationService.createConversation({ title: "Test chat" });
    await conversationService.renameConversation(conversation.id, "Renamed");
    await conversationService.deleteConversation(conversation.id);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/conversations",
      "/api/conversations",
      "/api/conversations/conv_1",
      "/api/conversations/conv_1",
    ]);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ title: "Test chat" }),
    });
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ title: "Renamed" }),
    });
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ method: "DELETE" });
  });

  it("loads messages and persists both sides of the simulated response", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([message("user", "Hello")]))
      .mockResolvedValueOnce(Response.json(message("user", "Hello"), { status: 201 }))
      .mockResolvedValueOnce(
        Response.json(message("assistant", "Simulated response"), { status: 201 }),
      );

    await chatService.getMessages(conversation.id);
    const chunks = [];
    for await (const chunk of chatService.sendMessage({
      conversationId: conversation.id,
      content: "Hello",
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ delta: "Simulated" }, { delta: " response" }, { done: true }]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/conversations/conv_1/messages",
      "/api/conversations/conv_1/messages",
      "/api/conversations/conv_1/messages",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      role: "user",
      content: "Hello",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({
      role: "assistant",
      content: "Simulated response",
    });
  });
});
