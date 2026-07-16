import { mockConversations, mockDelay, mockId } from "@/mocks/mock-data";
import type {
  Conversation,
  ConversationService,
  CreateConversationInput,
} from "./conversation.types";
import { ConversationNotFoundError } from "./conversation.types";

const STORAGE_KEY = "aster.conversations.v1";

function load(): Conversation[] {
  if (typeof window === "undefined") return [...mockConversations];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockConversations));
      return [...mockConversations];
    }
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [...mockConversations];
  }
}

function save(list: Conversation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const mockConversationService: ConversationService = {
  async getConversations() {
    await mockDelay();
    return load().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async getConversation(id: string) {
    await mockDelay(100, 250);
    const found = load().find((c) => c.id === id);
    if (!found) throw new ConversationNotFoundError();
    return found;
  },

  async createConversation(input?: CreateConversationInput) {
    await mockDelay(100, 250);
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: mockId("conv"),
      title: input?.title?.trim() || "New conversation",
      createdAt: now,
      updatedAt: now,
    };
    save([conv, ...load()]);
    return conv;
  },

  async renameConversation(id: string, title: string) {
    await mockDelay();
    const list = load();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new ConversationNotFoundError();
    list[idx] = { ...list[idx], title, updatedAt: new Date().toISOString() };
    save(list);
    return list[idx];
  },

  async deleteConversation(id: string) {
    await mockDelay();
    save(load().filter((c) => c.id !== id));
  },
};

// Internal helper used by the mock chat service to bump updatedAt/title
// without a network round trip. Not part of the public service contract.
export function touchMockConversation(id: string, title?: string) {
  if (typeof window === "undefined") return;
  const list = load();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return;
  list[idx] = {
    ...list[idx],
    title: title ?? list[idx].title,
    updatedAt: new Date().toISOString(),
  };
  save(list);
}
