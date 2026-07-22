import { describe, expect, it } from "vitest";

import type {
  CreateProjectInput,
  Project,
  ProjectDocument,
  UpdateProjectInput,
} from "../../contracts";
import type { ValidatedDocumentUpload } from "./document-processing.server";
import { createProjectsApi, type ProjectStore } from "./projects.server";

type StoredProject = Project & { userId: string };
type StoredDocument = ProjectDocument & { extractedText: string };

class MemoryProjectStore implements ProjectStore {
  private projects = new Map<string, StoredProject>();
  private documents = new Map<string, StoredDocument>();
  private sequence = 0;

  extractedText(documentId: string) {
    return this.documents.get(documentId)?.extractedText;
  }

  private publicProject(project: StoredProject): Project {
    const { userId: _userId, ...result } = project;
    return result;
  }

  private publicDocument(document: StoredDocument): ProjectDocument {
    const { extractedText: _extractedText, ...result } = document;
    return result;
  }

  async listProjects(userId: string) {
    return [...this.projects.values()]
      .filter((project) => project.userId === userId)
      .map((project) => this.publicProject(project));
  }

  async createProject(userId: string, input: CreateProjectInput) {
    const now = "2026-01-01T00:00:00.000Z";
    const project: StoredProject = {
      id: "project_" + ++this.sequence,
      userId,
      name: input.name,
      description: input.description || null,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    return this.publicProject(project);
  }

  async getProject(userId: string, projectId: string) {
    const project = this.projects.get(projectId);
    return project?.userId === userId ? this.publicProject(project) : null;
  }

  async updateProject(userId: string, projectId: string, input: UpdateProjectInput) {
    const project = this.projects.get(projectId);
    if (!project || project.userId !== userId) return null;
    if (input.name !== undefined) project.name = input.name;
    if (input.description !== undefined) project.description = input.description;
    project.updatedAt = "2026-01-02T00:00:00.000Z";
    return this.publicProject(project);
  }

  async deleteProject(userId: string, projectId: string) {
    const project = this.projects.get(projectId);
    if (!project || project.userId !== userId) return false;
    this.projects.delete(projectId);
    for (const [id, document] of this.documents) {
      if (document.projectId === projectId) this.documents.delete(id);
    }
    return true;
  }

  async listDocuments(userId: string, projectId: string) {
    if (!(await this.getProject(userId, projectId))) return null;
    return [...this.documents.values()]
      .filter((document) => document.projectId === projectId)
      .map((document) => this.publicDocument(document));
  }

  async createProcessingDocument(
    userId: string,
    projectId: string,
    upload: Omit<ValidatedDocumentUpload, "bytes">,
  ) {
    if (!(await this.getProject(userId, projectId))) return null;
    const now = "2026-01-01T00:00:00.000Z";
    const document: StoredDocument = {
      id: "document_" + ++this.sequence,
      projectId,
      originalFilename: upload.originalFilename,
      mimeType: upload.mimeType,
      fileSize: upload.fileSize,
      extractedText: "",
      processingStatus: "processing",
      processingError: null,
      createdAt: now,
      updatedAt: now,
    };
    this.documents.set(document.id, document);
    return this.publicDocument(document);
  }

  async completeDocument(
    userId: string,
    projectId: string,
    documentId: string,
    extractedText: string,
  ) {
    if (!(await this.getProject(userId, projectId))) return null;
    const document = this.documents.get(documentId);
    if (!document || document.projectId !== projectId) return null;
    document.extractedText = extractedText;
    document.processingStatus = "ready";
    return this.publicDocument(document);
  }

  async failDocument(
    userId: string,
    projectId: string,
    documentId: string,
    processingError: string,
  ) {
    if (!(await this.getProject(userId, projectId))) return null;
    const document = this.documents.get(documentId);
    if (!document || document.projectId !== projectId) return null;
    document.processingStatus = "failed";
    document.processingError = processingError;
    return this.publicDocument(document);
  }

  async deleteDocument(userId: string, projectId: string, documentId: string) {
    if (!(await this.getProject(userId, projectId))) return false;
    const document = this.documents.get(documentId);
    if (!document || document.projectId !== projectId) return false;
    return this.documents.delete(documentId);
  }

  async getReadyDocumentTexts(userId: string, projectId: string) {
    if (!(await this.getProject(userId, projectId))) return [];
    return [...this.documents.values()]
      .filter(
        (document) => document.projectId === projectId && document.processingStatus === "ready",
      )
      .map((document) => ({
        filename: document.originalFilename,
        text: document.extractedText,
      }));
  }
}

function jsonRequest(method: string, path: string, userId?: string, body?: unknown) {
  return new Request("http://localhost" + path, {
    method,
    headers: {
      ...(userId ? { "x-test-user": userId } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function uploadRequest(projectId: string, userId: string, file: File) {
  const form = new FormData();
  form.set("file", file);
  return new Request("http://localhost/api/projects/" + projectId + "/documents", {
    method: "POST",
    headers: { "x-test-user": userId },
    body: form,
  });
}

function setup() {
  const store = new MemoryProjectStore();
  const api = createProjectsApi({
    store,
    resolveUserId: async (request) => request.headers.get("x-test-user"),
    bodyLimitBytes: 16_384,
  });
  return { api, store };
}

describe("authenticated projects API", () => {
  it("creates, lists, updates, and deletes only owned projects", async () => {
    const { api } = setup();
    const createdResponse = await api.projects(
      jsonRequest("POST", "/api/projects", "user-a", {
        name: "Research",
        description: "Project notes",
      }),
      "create",
    );
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as Project;

    const listed = await api.projects(jsonRequest("GET", "/api/projects", "user-a"), "list");
    await expect(listed.json()).resolves.toEqual([created]);

    const foreign = await api.project(
      jsonRequest("GET", "/api/projects/" + created.id, "user-b"),
      "foreign",
      created.id,
    );
    expect(foreign.status).toBe(404);

    const updated = await api.project(
      jsonRequest("PATCH", "/api/projects/" + created.id, "user-a", {
        name: "Renamed research",
      }),
      "update",
      created.id,
    );
    await expect(updated.json()).resolves.toMatchObject({ name: "Renamed research" });

    const deleted = await api.project(
      jsonRequest("DELETE", "/api/projects/" + created.id, "user-a"),
      "delete",
      created.id,
    );
    expect(deleted.status).toBe(204);
  });

  it("uploads, extracts, lists, and deletes an owned text document", async () => {
    const { api, store } = setup();
    const project = (await (
      await api.projects(jsonRequest("POST", "/api/projects", "user-a", { name: "Docs" }), "create")
    ).json()) as Project;

    const uploaded = await api.documents(
      uploadRequest(
        project.id,
        "user-a",
        new File(["The launch date is October 4."], "launch.txt", {
          type: "text/plain",
        }),
      ),
      "upload",
      project.id,
    );
    expect(uploaded.status).toBe(201);
    const document = (await uploaded.json()) as ProjectDocument;
    expect(document.processingStatus).toBe("ready");
    expect(store.extractedText(document.id)).toBe("The launch date is October 4.");

    const listed = await api.documents(
      jsonRequest("GET", "/api/projects/" + project.id + "/documents", "user-a"),
      "documents",
      project.id,
    );
    const payload = (await listed.json()) as ProjectDocument[];
    expect(payload).toEqual([document]);
    expect(payload[0]).not.toHaveProperty("extractedText");

    const foreign = await api.documents(
      jsonRequest("GET", "/api/projects/" + project.id + "/documents", "user-b"),
      "foreign-documents",
      project.id,
    );
    expect(foreign.status).toBe(404);

    const deleted = await api.document(
      jsonRequest("DELETE", "/api/projects/" + project.id + "/documents/" + document.id, "user-a"),
      "delete-document",
      project.id,
      document.id,
    );
    expect(deleted.status).toBe(204);
  });

  it("rejects unauthenticated project requests", async () => {
    const { api } = setup();
    const response = await api.projects(jsonRequest("GET", "/api/projects"), "anonymous");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });
});
