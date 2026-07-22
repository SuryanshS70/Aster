import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { chatService } from "./chat/chat.service";
import { conversationService } from "./conversations/conversation.service";
import { modelPreferenceService } from "./settings/model-preference.service";
import { projectService } from "./projects/project.service";

const conversation = {
  id: "conv_1",
  title: "Test chat",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  projectId: null,
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

  it("loads messages and maps one send to the generation endpoint", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([message("user", "Hello")]))
      .mockResolvedValueOnce(
        Response.json(
          {
            user: message("user", "Hello"),
            assistant: message("assistant", "Gemini response"),
          },
          { status: 201 },
        ),
      );

    await chatService.getMessages(conversation.id);
    const chunks = [];
    for await (const chunk of chatService.sendMessage({
      conversationId: conversation.id,
      content: "Hello",
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ delta: "Gemini response" }, { done: true }]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/conversations/conv_1/messages",
      "/api/conversations/conv_1/generate",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      message: "Hello",
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "POST" });
  });

  it("maps regeneration without sending or duplicating the user message", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        user: message("user", "Hello"),
        assistant: message("assistant", "Replacement response"),
      }),
    );

    const chunks = [];
    for await (const chunk of chatService.regenerateResponse(conversation.id)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ delta: "Replacement response" }, { done: true }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/conversations/conv_1/regenerate");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined();
  });

  it("maps model preference loading and saving to the authenticated settings API", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ model: "gemini-3.5-flash" }))
      .mockResolvedValueOnce(Response.json({ model: "gemini-3.5-flash-lite" }));

    await modelPreferenceService.get();
    await modelPreferenceService.update("gemini-3.5-flash-lite");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/settings/model",
      "/api/settings/model",
    ]);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "same-origin" });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "PATCH",
      credentials: "same-origin",
      body: JSON.stringify({ model: "gemini-3.5-flash-lite" }),
    });
  });

  it("maps project and document operations to authenticated APIs", async () => {
    const project = {
      id: "project_1",
      name: "Research",
      description: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const document = {
      id: "document_1",
      projectId: project.id,
      originalFilename: "notes.txt",
      mimeType: "text/plain",
      fileSize: 5,
      processingStatus: "ready",
      processingError: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    fetchMock
      .mockResolvedValueOnce(Response.json([project]))
      .mockResolvedValueOnce(Response.json(project, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ ...project, name: "Renamed" }))
      .mockResolvedValueOnce(Response.json([document]))
      .mockResolvedValueOnce(Response.json(document, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await projectService.getProjects();
    await projectService.createProject({ name: "Research" });
    await projectService.updateProject(project.id, { name: "Renamed" });
    await projectService.getDocuments(project.id);
    await projectService.uploadDocument(
      project.id,
      new File(["notes"], "notes.txt", { type: "text/plain" }),
    );
    await projectService.deleteDocument(project.id, document.id);
    await projectService.deleteProject(project.id);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/projects",
      "/api/projects",
      "/api/projects/project_1",
      "/api/projects/project_1/documents",
      "/api/projects/project_1/documents",
      "/api/projects/project_1/documents/document_1",
      "/api/projects/project_1",
    ]);
    expect(fetchMock.mock.calls[4]?.[1]?.body).toBeInstanceOf(FormData);
    expect(fetchMock.mock.calls[5]?.[1]).toMatchObject({ method: "DELETE" });
  });
});
