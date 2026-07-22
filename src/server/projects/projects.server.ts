import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  DOCUMENT_UPLOAD_REQUEST_LIMIT_BYTES,
  createProjectInputSchema,
  projectDocumentIdSchema,
  projectIdSchema,
  updateProjectInputSchema,
  type CreateProjectInput,
  type Project,
  type ProjectDocument,
  type UpdateProjectInput,
} from "../../contracts";
import { getDatabase } from "../db/client.server";
import { projectDocuments, projects } from "../db/schema";
import { withApiErrorBoundary } from "../http/api-handler.server";
import { readJsonBody } from "../http/body.server";
import { ApiError, jsonResponse } from "../http/responses.server";
import {
  DocumentProcessingError,
  extractDocumentText,
  validateDocumentUpload,
  type ValidatedDocumentUpload,
} from "./document-processing.server";

type ProjectRow = typeof projects.$inferSelect;
type ProjectDocumentRow = typeof projectDocuments.$inferSelect;

export type ReadyProjectDocument = {
  filename: string;
  text: string;
};

export interface ProjectStore {
  listProjects(userId: string): Promise<Project[]>;
  createProject(userId: string, input: CreateProjectInput): Promise<Project>;
  getProject(userId: string, projectId: string): Promise<Project | null>;
  updateProject(
    userId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<Project | null>;
  deleteProject(userId: string, projectId: string): Promise<boolean>;
  listDocuments(userId: string, projectId: string): Promise<ProjectDocument[] | null>;
  createProcessingDocument(
    userId: string,
    projectId: string,
    upload: Omit<ValidatedDocumentUpload, "bytes">,
  ): Promise<ProjectDocument | null>;
  completeDocument(
    userId: string,
    projectId: string,
    documentId: string,
    extractedText: string,
  ): Promise<ProjectDocument | null>;
  failDocument(
    userId: string,
    projectId: string,
    documentId: string,
    processingError: string,
  ): Promise<ProjectDocument | null>;
  deleteDocument(userId: string, projectId: string, documentId: string): Promise<boolean>;
  getReadyDocumentTexts(userId: string, projectId: string): Promise<ReadyProjectDocument[]>;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toProjectDocument(row: ProjectDocumentRow): ProjectDocument {
  return {
    id: row.id,
    projectId: row.projectId,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType as ProjectDocument["mimeType"],
    fileSize: row.fileSize,
    processingStatus: row.processingStatus as ProjectDocument["processingStatus"],
    processingError: row.processingError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createProjectStore(database: PostgresJsDatabase = getDatabase()): ProjectStore {
  async function ownsProject(userId: string, projectId: string): Promise<boolean> {
    const [owned] = await database
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);
    return Boolean(owned);
  }

  return {
    async listProjects(userId) {
      const rows = await database
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));
      return rows.map(toProject);
    },

    async createProject(userId, input) {
      const [row] = await database
        .insert(projects)
        .values({
          id: crypto.randomUUID(),
          userId,
          name: input.name,
          description: input.description?.trim() || null,
        })
        .returning();
      if (!row) throw new Error("Project insert did not return a row");
      return toProject(row);
    },

    async getProject(userId, projectId) {
      const [row] = await database
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .limit(1);
      return row ? toProject(row) : null;
    },

    async updateProject(userId, projectId, input) {
      const [row] = await database
        .update(projects)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .returning();
      return row ? toProject(row) : null;
    },

    async deleteProject(userId, projectId) {
      const deleted = await database
        .delete(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .returning({ id: projects.id });
      return deleted.length === 1;
    },

    async listDocuments(userId, projectId) {
      if (!(await ownsProject(userId, projectId))) return null;
      const rows = await database
        .select()
        .from(projectDocuments)
        .where(eq(projectDocuments.projectId, projectId))
        .orderBy(desc(projectDocuments.createdAt));
      return rows.map(toProjectDocument);
    },

    async createProcessingDocument(userId, projectId, upload) {
      if (!(await ownsProject(userId, projectId))) return null;
      const now = new Date();
      const [row] = await database
        .insert(projectDocuments)
        .values({
          id: crypto.randomUUID(),
          projectId,
          originalFilename: upload.originalFilename,
          mimeType: upload.mimeType,
          fileSize: upload.fileSize,
          processingStatus: "processing",
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      if (!row) throw new Error("Project document insert did not return a row");
      await database
        .update(projects)
        .set({ updatedAt: now })
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
      return toProjectDocument(row);
    },

    async completeDocument(userId, projectId, documentId, extractedText) {
      if (!(await ownsProject(userId, projectId))) return null;
      const [row] = await database
        .update(projectDocuments)
        .set({
          extractedText,
          processingStatus: "ready",
          processingError: null,
          updatedAt: new Date(),
        })
        .where(and(eq(projectDocuments.id, documentId), eq(projectDocuments.projectId, projectId)))
        .returning();
      return row ? toProjectDocument(row) : null;
    },

    async failDocument(userId, projectId, documentId, processingError) {
      if (!(await ownsProject(userId, projectId))) return null;
      const [row] = await database
        .update(projectDocuments)
        .set({
          extractedText: "",
          processingStatus: "failed",
          processingError,
          updatedAt: new Date(),
        })
        .where(and(eq(projectDocuments.id, documentId), eq(projectDocuments.projectId, projectId)))
        .returning();
      return row ? toProjectDocument(row) : null;
    },

    async deleteDocument(userId, projectId, documentId) {
      if (!(await ownsProject(userId, projectId))) return false;
      const deleted = await database
        .delete(projectDocuments)
        .where(and(eq(projectDocuments.id, documentId), eq(projectDocuments.projectId, projectId)))
        .returning({ id: projectDocuments.id });
      if (deleted.length === 1) {
        await database
          .update(projects)
          .set({ updatedAt: new Date() })
          .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
      }
      return deleted.length === 1;
    },

    async getReadyDocumentTexts(userId, projectId) {
      const rows = await database
        .select({
          filename: projectDocuments.originalFilename,
          text: projectDocuments.extractedText,
        })
        .from(projectDocuments)
        .innerJoin(projects, eq(projects.id, projectDocuments.projectId))
        .where(
          and(
            eq(projectDocuments.projectId, projectId),
            eq(projectDocuments.processingStatus, "ready"),
            eq(projects.userId, userId),
          ),
        )
        .orderBy(desc(projectDocuments.createdAt));
      return rows;
    },
  };
}

type ResolveUserId = (request: Request) => Promise<string | null>;

async function resolveVerifiedUserId(request: Request): Promise<string | null> {
  const { auth } = await import("../auth/auth.server");
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

async function requireUserId(request: Request, resolveUserId: ResolveUserId): Promise<string> {
  const userId = await resolveUserId(request);
  if (!userId) throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  return userId;
}

function parseInput<T>(
  schema: {
    safeParse: (
      value: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: Array<{ message: string }> } };
  },
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "BAD_REQUEST", result.error.issues[0]?.message ?? "Request is invalid");
  }
  return result.data;
}

function projectNotFound(): never {
  throw new ApiError(404, "NOT_FOUND", "Project not found");
}

function documentNotFound(): never {
  throw new ApiError(404, "NOT_FOUND", "Document not found");
}

async function readLimitedFormData(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(400, "BAD_REQUEST", "Document upload must use multipart form data");
  }
  if (!request.body) throw new ApiError(400, "BAD_REQUEST", "A document file is required");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > DOCUMENT_UPLOAD_REQUEST_LIMIT_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "CONTENT_TOO_LARGE", "Document upload is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const replay = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: bytes.buffer,
    });
    return await replay.formData();
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "Document upload is invalid");
  }
}

export function createProjectsApi({
  store,
  resolveUserId = resolveVerifiedUserId,
  validateUpload = validateDocumentUpload,
  extractText = extractDocumentText,
  bodyLimitBytes = 1_048_576,
}: {
  store: ProjectStore;
  resolveUserId?: ResolveUserId;
  validateUpload?: typeof validateDocumentUpload;
  extractText?: typeof extractDocumentText;
  bodyLimitBytes?: number;
}) {
  return {
    projects(request: Request, requestId: string): Promise<Response> {
      return withApiErrorBoundary(requestId, async () => {
        const userId = await requireUserId(request, resolveUserId);
        if (request.method === "GET") return jsonResponse(await store.listProjects(userId));
        if (request.method === "POST") {
          const input = parseInput(
            createProjectInputSchema,
            await readJsonBody(request, bodyLimitBytes),
          );
          return jsonResponse(await store.createProject(userId, input), { status: 201 });
        }
        throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
      });
    },

    project(request: Request, requestId: string, rawProjectId: string): Promise<Response> {
      return withApiErrorBoundary(requestId, async () => {
        const userId = await requireUserId(request, resolveUserId);
        const projectId = parseInput(projectIdSchema, rawProjectId);
        if (request.method === "GET") {
          return jsonResponse((await store.getProject(userId, projectId)) ?? projectNotFound());
        }
        if (request.method === "PATCH") {
          const input = parseInput(
            updateProjectInputSchema,
            await readJsonBody(request, bodyLimitBytes),
          );
          return jsonResponse(
            (await store.updateProject(userId, projectId, input)) ?? projectNotFound(),
          );
        }
        if (request.method === "DELETE") {
          if (!(await store.deleteProject(userId, projectId))) projectNotFound();
          return new Response(null, { status: 204 });
        }
        throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
      });
    },

    documents(request: Request, requestId: string, rawProjectId: string): Promise<Response> {
      return withApiErrorBoundary(requestId, async () => {
        const userId = await requireUserId(request, resolveUserId);
        const projectId = parseInput(projectIdSchema, rawProjectId);
        if (request.method === "GET") {
          return jsonResponse((await store.listDocuments(userId, projectId)) ?? projectNotFound());
        }
        if (request.method !== "POST") {
          throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
        }

        const form = await readLimitedFormData(request);
        const file = form.get("file");
        if (!(file instanceof File)) {
          throw new ApiError(400, "BAD_REQUEST", "A document file is required");
        }

        let upload: ValidatedDocumentUpload;
        try {
          upload = await validateUpload(file);
        } catch (error) {
          if (error instanceof DocumentProcessingError) {
            throw new ApiError(400, "BAD_REQUEST", error.publicMessage);
          }
          throw error;
        }

        const processing = await store.createProcessingDocument(userId, projectId, {
          originalFilename: upload.originalFilename,
          mimeType: upload.mimeType,
          fileSize: upload.fileSize,
        });
        if (!processing) projectNotFound();

        try {
          const extractedText = await extractText(upload);
          const completed = await store.completeDocument(
            userId,
            projectId,
            processing.id,
            extractedText,
          );
          return jsonResponse(completed ?? documentNotFound(), { status: 201 });
        } catch (error) {
          const processingError =
            error instanceof DocumentProcessingError
              ? error.publicMessage
              : "Text could not be extracted from this document.";
          const failed = await store.failDocument(
            userId,
            projectId,
            processing.id,
            processingError,
          );
          return jsonResponse(failed ?? documentNotFound(), { status: 201 });
        }
      });
    },

    document(
      request: Request,
      requestId: string,
      rawProjectId: string,
      rawDocumentId: string,
    ): Promise<Response> {
      return withApiErrorBoundary(requestId, async () => {
        const userId = await requireUserId(request, resolveUserId);
        const projectId = parseInput(projectIdSchema, rawProjectId);
        const documentId = parseInput(projectDocumentIdSchema, rawDocumentId);
        if (request.method !== "DELETE") {
          throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
        }
        if (!(await store.deleteDocument(userId, projectId, documentId))) documentNotFound();
        return new Response(null, { status: 204 });
      });
    },
  };
}

let productionApi: ReturnType<typeof createProjectsApi> | undefined;

function getProductionApi() {
  productionApi ??= createProjectsApi({ store: createProjectStore() });
  return productionApi;
}

export function handleProjectsRequest(request: Request, requestId: string) {
  return getProductionApi().projects(request, requestId);
}

export function handleProjectRequest(request: Request, requestId: string, projectId: string) {
  return getProductionApi().project(request, requestId, projectId);
}

export function handleProjectDocumentsRequest(
  request: Request,
  requestId: string,
  projectId: string,
) {
  return getProductionApi().documents(request, requestId, projectId);
}

export function handleProjectDocumentRequest(
  request: Request,
  requestId: string,
  projectId: string,
  documentId: string,
) {
  return getProductionApi().document(request, requestId, projectId, documentId);
}
