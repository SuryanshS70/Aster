import { and, asc, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  conversationIdSchema,
  createConversationInputSchema,
  createMessageInputSchema,
  generateMessageInputSchema,
  messageContentSchema,
  renameConversationInputSchema,
  type Conversation,
  type CreateMessageInput,
  type Message,
  type GeminiModel,
} from "../../contracts";
import type { GeminiHistoryMessage } from "../gemini/gemini.server";
import { getServerEnv } from "../config/env.server";
import { getDatabase } from "../db/client.server";
import { conversations, messages, projectDocuments, projects } from "../db/schema";
import { withApiErrorBoundary } from "../http/api-handler.server";
import { readJsonBody } from "../http/body.server";
import { ApiError, jsonResponse } from "../http/responses.server";
import { retrieveRelevantContext } from "../projects/retrieval.server";

export interface ChatStore {
  listConversations(userId: string): Promise<Conversation[]>;
  createConversation(
    userId: string,
    title: string,
    projectId?: string,
  ): Promise<Conversation | null>;
  getConversation(userId: string, id: string): Promise<Conversation | null>;
  renameConversation(userId: string, id: string, title: string): Promise<Conversation | null>;
  deleteConversation(userId: string, id: string): Promise<boolean>;
  listMessages(userId: string, conversationId: string): Promise<Message[] | null>;
  createMessage(
    userId: string,
    conversationId: string,
    input: CreateMessageInput,
  ): Promise<Message | null>;
  getRecentMessages(
    userId: string,
    conversationId: string,
    limit: number,
  ): Promise<Message[] | null>;
  getProjectContext(
    userId: string,
    conversationId: string,
    query: string,
  ): Promise<string | null | undefined>;
  persistGeneratedMessages(
    userId: string,
    conversationId: string,
    userContent: string,
    assistantContent: string,
  ): Promise<{ user: Message; assistant: Message } | null>;
  replaceAssistantMessage(
    userId: string,
    conversationId: string,
    assistantMessageId: string,
    assistantContent: string,
  ): Promise<Message | null>;
}

type ConversationRow = typeof conversations.$inferSelect;
type MessageRow = typeof messages.$inferSelect;
const DEFAULT_CONVERSATION_TITLE = "New conversation";

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    projectId: row.projectId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as "user" | "assistant",
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    status: "complete",
  };
}

export function createChatStore(database: PostgresJsDatabase = getDatabase()): ChatStore {
  return {
    async listConversations(userId) {
      const rows = await database
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt));
      return rows.map(toConversation);
    },

    async createConversation(userId, title, projectId) {
      if (projectId) {
        const [ownedProject] = await database
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
          .limit(1);
        if (!ownedProject) return null;
      }
      const [row] = await database
        .insert(conversations)
        .values({ id: crypto.randomUUID(), userId, title, projectId: projectId ?? null })
        .returning();
      if (!row) throw new Error("Conversation insert did not return a row");
      return toConversation(row);
    },

    async getConversation(userId, id) {
      const [row] = await database
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .limit(1);
      return row ? toConversation(row) : null;
    },

    async renameConversation(userId, id, title) {
      const [row] = await database
        .update(conversations)
        .set({ title, updatedAt: new Date() })
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .returning();
      return row ? toConversation(row) : null;
    },

    async deleteConversation(userId, id) {
      const deleted = await database
        .delete(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .returning({ id: conversations.id });
      return deleted.length === 1;
    },

    async listMessages(userId, conversationId) {
      const [owned] = await database
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);
      if (!owned) return null;

      const rows = await database
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt), asc(messages.id));
      return rows.map(toMessage);
    },

    async createMessage(userId, conversationId, input) {
      const [owned] = await database
        .select({ id: conversations.id, title: conversations.title })
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);
      if (!owned) return null;

      const now = new Date();
      const [row] = await database
        .insert(messages)
        .values({
          id: crypto.randomUUID(),
          conversationId,
          role: input.role,
          content: input.content,
          createdAt: now,
        })
        .returning();
      if (!row) throw new Error("Message insert did not return a row");

      await database
        .update(conversations)
        .set({
          updatedAt: now,
          ...(input.role === "user" && owned.title === DEFAULT_CONVERSATION_TITLE
            ? { title: input.content.trim().slice(0, 60) }
            : {}),
        })
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
      return toMessage(row);
    },

    async getRecentMessages(userId, conversationId, limit) {
      const [owned] = await database
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);
      if (!owned) return null;

      const rows = await database
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(limit);
      return rows.reverse().map(toMessage);
    },
    async getProjectContext(userId, conversationId, query) {
      const [owned] = await database
        .select({ projectId: conversations.projectId })
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);
      if (!owned) return null;
      if (!owned.projectId) return undefined;

      const documents = await database
        .select({
          filename: projectDocuments.originalFilename,
          text: projectDocuments.extractedText,
        })
        .from(projectDocuments)
        .innerJoin(projects, eq(projects.id, projectDocuments.projectId))
        .where(
          and(
            eq(projectDocuments.projectId, owned.projectId),
            eq(projectDocuments.processingStatus, "ready"),
            eq(projects.userId, userId),
          ),
        );
      return retrieveRelevantContext(documents, query);
    },

    async persistGeneratedMessages(userId, conversationId, userContent, assistantContent) {
      return database.transaction(async (transaction) => {
        const [owned] = await transaction
          .select({ id: conversations.id, title: conversations.title })
          .from(conversations)
          .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
          .limit(1);
        if (!owned) return null;

        const userCreatedAt = new Date();
        const assistantCreatedAt = new Date(userCreatedAt.getTime() + 1);
        const inserted = await transaction
          .insert(messages)
          .values([
            {
              id: crypto.randomUUID(),
              conversationId,
              role: "user",
              content: userContent,
              createdAt: userCreatedAt,
            },
            {
              id: crypto.randomUUID(),
              conversationId,
              role: "assistant",
              content: assistantContent,
              createdAt: assistantCreatedAt,
            },
          ])
          .returning();
        const userMessage = inserted.find((message) => message.role === "user");
        const assistantMessage = inserted.find((message) => message.role === "assistant");
        if (!userMessage || !assistantMessage) {
          throw new Error("Generation message insert did not return both rows");
        }

        await transaction
          .update(conversations)
          .set({
            ...(owned.title === DEFAULT_CONVERSATION_TITLE
              ? { title: userContent.trim().slice(0, 60) }
              : {}),
            updatedAt: assistantCreatedAt,
          })
          .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
        return { user: toMessage(userMessage), assistant: toMessage(assistantMessage) };
      });
    },

    async replaceAssistantMessage(userId, conversationId, assistantMessageId, assistantContent) {
      return database.transaction(async (transaction) => {
        const [owned] = await transaction
          .select({ id: conversations.id })
          .from(conversations)
          .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
          .limit(1);
        if (!owned) return null;

        const [row] = await transaction
          .update(messages)
          .set({ content: assistantContent })
          .where(
            and(
              eq(messages.id, assistantMessageId),
              eq(messages.conversationId, conversationId),
              eq(messages.role, "assistant"),
            ),
          )
          .returning();
        if (!row) return null;

        await transaction
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
        return toMessage(row);
      });
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

function notFound(): never {
  throw new ApiError(404, "NOT_FOUND", "Conversation not found");
}
function projectNotFound(): never {
  throw new ApiError(404, "NOT_FOUND", "Project not found");
}

type GenerateWithGemini = (
  history: GeminiHistoryMessage[],
  message: string,
  model: GeminiModel,
  projectContext?: string,
) => Promise<string>;
type ResolveModelPreference = (userId: string) => Promise<GeminiModel>;

async function generateWithGemini(
  history: GeminiHistoryMessage[],
  message: string,
  model: GeminiModel,
  projectContext?: string,
) {
  const { createGeminiProvider } = await import("../gemini/gemini.server");
  return createGeminiProvider().generate(history, message, model, projectContext);
}

async function resolveModelPreference(userId: string): Promise<GeminiModel> {
  const { getUserModelPreference } = await import("../settings/model-preference.server");
  return getUserModelPreference(userId);
}

export function createChatApi({
  store,
  resolveUserId = resolveVerifiedUserId,
  resolveModel = resolveModelPreference,
  generate = generateWithGemini,
  bodyLimitBytes = getServerEnv().REQUEST_BODY_LIMIT_BYTES,
}: {
  store: ChatStore;
  resolveUserId?: ResolveUserId;
  resolveModel?: ResolveModelPreference;
  generate?: GenerateWithGemini;
  bodyLimitBytes?: number;
}) {
  return {
    conversations(request: Request, requestId: string): Promise<Response> {
      return withApiErrorBoundary(requestId, async () => {
        const userId = await requireUserId(request, resolveUserId);
        if (request.method === "GET") {
          return jsonResponse(await store.listConversations(userId));
        }
        if (request.method === "POST") {
          const input = parseInput(
            createConversationInputSchema,
            await readJsonBody(request, bodyLimitBytes),
          );
          const conversation = await store.createConversation(
            userId,
            input.title ?? DEFAULT_CONVERSATION_TITLE,
            input.projectId,
          );
          return jsonResponse(conversation ?? projectNotFound(), {
            status: 201,
          });
        }
        throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
      });
    },

    conversation(
      request: Request,
      requestId: string,
      rawConversationId: string,
    ): Promise<Response> {
      return withApiErrorBoundary(requestId, async () => {
        const userId = await requireUserId(request, resolveUserId);
        const conversationId = parseInput(conversationIdSchema, rawConversationId);
        if (request.method === "GET") {
          const conversation = await store.getConversation(userId, conversationId);
          return jsonResponse(conversation ?? notFound());
        }
        if (request.method === "PATCH") {
          const input = parseInput(
            renameConversationInputSchema,
            await readJsonBody(request, bodyLimitBytes),
          );
          const conversation = await store.renameConversation(userId, conversationId, input.title);
          return jsonResponse(conversation ?? notFound());
        }
        if (request.method === "DELETE") {
          if (!(await store.deleteConversation(userId, conversationId))) notFound();
          return new Response(null, { status: 204 });
        }
        throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
      });
    },

    conversationMessages(
      request: Request,
      requestId: string,
      rawConversationId: string,
    ): Promise<Response> {
      return withApiErrorBoundary(requestId, async () => {
        const userId = await requireUserId(request, resolveUserId);
        const conversationId = parseInput(conversationIdSchema, rawConversationId);
        if (request.method === "GET") {
          const result = await store.listMessages(userId, conversationId);
          return jsonResponse(result ?? notFound());
        }
        if (request.method === "POST") {
          const input = parseInput(
            createMessageInputSchema,
            await readJsonBody(request, bodyLimitBytes),
          );
          const message = await store.createMessage(userId, conversationId, input);
          return jsonResponse(message ?? notFound(), { status: 201 });
        }
        throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
      });
    },

    generation(request: Request, requestId: string, rawConversationId: string): Promise<Response> {
      return withApiErrorBoundary(requestId, async () => {
        const userId = await requireUserId(request, resolveUserId);
        const conversationId = parseInput(conversationIdSchema, rawConversationId);
        if (request.method !== "POST") {
          throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
        }
        const input = parseInput(
          generateMessageInputSchema,
          await readJsonBody(request, bodyLimitBytes),
        );
        const history = await store.getRecentMessages(userId, conversationId, 20);
        if (!history) notFound();
        const model = await resolveModel(userId);
        const projectContext = await store.getProjectContext(userId, conversationId, input.message);
        if (projectContext === null) notFound();

        let generated: string;
        try {
          generated = await generate(history, input.message, model, projectContext);
        } catch {
          throw new ApiError(
            502,
            "SERVICE_UNAVAILABLE",
            "Unable to generate a response. Please try again.",
          );
        }
        const assistantContent = messageContentSchema.safeParse(generated);
        if (!assistantContent.success) {
          throw new ApiError(
            502,
            "SERVICE_UNAVAILABLE",
            "Unable to generate a response. Please try again.",
          );
        }

        const persisted = await store.persistGeneratedMessages(
          userId,
          conversationId,
          input.message,
          assistantContent.data,
        );
        return jsonResponse(persisted ?? notFound(), { status: 201 });
      });
    },

    regeneration(
      request: Request,
      requestId: string,
      rawConversationId: string,
    ): Promise<Response> {
      return withApiErrorBoundary(requestId, async () => {
        const userId = await requireUserId(request, resolveUserId);
        const conversationId = parseInput(conversationIdSchema, rawConversationId);
        if (request.method !== "POST") {
          throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
        }

        const recent = await store.getRecentMessages(userId, conversationId, 22);
        if (!recent) notFound();
        const assistant = recent.at(-1);
        let userIndex = -1;
        for (let index = recent.length - 2; index >= 0; index -= 1) {
          if (recent[index]?.role === "user") {
            userIndex = index;
            break;
          }
        }
        const user = userIndex >= 0 ? recent[userIndex] : undefined;
        if (!assistant || assistant.role !== "assistant" || !user) {
          throw new ApiError(400, "BAD_REQUEST", "No assistant response to regenerate");
        }

        const model = await resolveModel(userId);
        const history = recent.slice(Math.max(0, userIndex - 20), userIndex);
        let generated: string;
        try {
          const projectContext = await store.getProjectContext(
            userId,
            conversationId,
            user.content,
          );
          if (projectContext === null) notFound();
          generated = await generate(history, user.content, model, projectContext);
        } catch {
          throw new ApiError(
            502,
            "SERVICE_UNAVAILABLE",
            "Unable to generate a response. Please try again.",
          );
        }
        const assistantContent = messageContentSchema.safeParse(generated);
        if (!assistantContent.success) {
          throw new ApiError(
            502,
            "SERVICE_UNAVAILABLE",
            "Unable to generate a response. Please try again.",
          );
        }

        const replacement = await store.replaceAssistantMessage(
          userId,
          conversationId,
          assistant.id,
          assistantContent.data,
        );
        return jsonResponse({ user, assistant: replacement ?? notFound() });
      });
    },
  };
}

let productionApi: ReturnType<typeof createChatApi> | undefined;

function getProductionApi() {
  productionApi ??= createChatApi({ store: createChatStore() });
  return productionApi;
}

export function handleConversationsRequest(request: Request, requestId: string) {
  return getProductionApi().conversations(request, requestId);
}

export function handleConversationRequest(
  request: Request,
  requestId: string,
  conversationId: string,
) {
  return getProductionApi().conversation(request, requestId, conversationId);
}

export function handleConversationMessagesRequest(
  request: Request,
  requestId: string,
  conversationId: string,
) {
  return getProductionApi().conversationMessages(request, requestId, conversationId);
}

export function handleConversationGenerationRequest(
  request: Request,
  requestId: string,
  conversationId: string,
) {
  return getProductionApi().generation(request, requestId, conversationId);
}

export function handleConversationRegenerationRequest(
  request: Request,
  requestId: string,
  conversationId: string,
) {
  return getProductionApi().regeneration(request, requestId, conversationId);
}
