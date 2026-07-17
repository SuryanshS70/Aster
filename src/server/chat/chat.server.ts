import { and, asc, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  conversationIdSchema,
  createConversationInputSchema,
  createMessageInputSchema,
  renameConversationInputSchema,
  type Conversation,
  type CreateMessageInput,
  type Message,
} from "../../contracts";
import { getServerEnv } from "../config/env.server";
import { getDatabase } from "../db/client.server";
import { conversations, messages } from "../db/schema";
import { withApiErrorBoundary } from "../http/api-handler.server";
import { readJsonBody } from "../http/body.server";
import { ApiError, jsonResponse } from "../http/responses.server";

export interface ChatStore {
  listConversations(userId: string): Promise<Conversation[]>;
  createConversation(userId: string, title: string): Promise<Conversation>;
  getConversation(userId: string, id: string): Promise<Conversation | null>;
  renameConversation(userId: string, id: string, title: string): Promise<Conversation | null>;
  deleteConversation(userId: string, id: string): Promise<boolean>;
  listMessages(userId: string, conversationId: string): Promise<Message[] | null>;
  createMessage(
    userId: string,
    conversationId: string,
    input: CreateMessageInput,
  ): Promise<Message | null>;
}

type ConversationRow = typeof conversations.$inferSelect;
type MessageRow = typeof messages.$inferSelect;

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
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

    async createConversation(userId, title) {
      const [row] = await database
        .insert(conversations)
        .values({ id: crypto.randomUUID(), userId, title })
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
        .select({ id: conversations.id })
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
          ...(input.role === "user" ? { title: input.content.trim().slice(0, 60) } : {}),
        })
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
      return toMessage(row);
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

export function createChatApi({
  store,
  resolveUserId = resolveVerifiedUserId,
  bodyLimitBytes = getServerEnv().REQUEST_BODY_LIMIT_BYTES,
}: {
  store: ChatStore;
  resolveUserId?: ResolveUserId;
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
          return jsonResponse(
            await store.createConversation(userId, input.title ?? "New conversation"),
            { status: 201 },
          );
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
