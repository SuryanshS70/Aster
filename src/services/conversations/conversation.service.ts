import {
  conversationIdSchema,
  conversationListSchema,
  conversationSchema,
  createConversationInputSchema,
  renameConversationInputSchema,
} from "@/contracts/conversations";
import type { ConversationService } from "./conversation.types";
import { ConversationNotFoundError } from "./conversation.types";

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: "same-origin" });
  } catch {
    throw new Error("Conversations are temporarily unavailable. Please try again.");
  }
  if (response.status === 404) throw new ConversationNotFoundError();
  if (!response.ok) throw new Error("Unable to update conversations. Please try again.");
  return response.status === 204 ? undefined : response.json();
}

export const conversationService: ConversationService = {
  async getConversations() {
    return conversationListSchema.parse(await request("/api/conversations"));
  },

  async createConversation(input = {}) {
    const validated = createConversationInputSchema.parse(input);
    return conversationSchema.parse(
      await request("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated),
      }),
    );
  },

  async getConversation(id) {
    const conversationId = conversationIdSchema.parse(id);
    return conversationSchema.parse(
      await request(`/api/conversations/${encodeURIComponent(conversationId)}`),
    );
  },

  async renameConversation(id, title) {
    const conversationId = conversationIdSchema.parse(id);
    const input = renameConversationInputSchema.parse({ title });
    return conversationSchema.parse(
      await request(`/api/conversations/${encodeURIComponent(conversationId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  },

  async deleteConversation(id) {
    const conversationId = conversationIdSchema.parse(id);
    await request(`/api/conversations/${encodeURIComponent(conversationId)}`, {
      method: "DELETE",
    });
  },
};
