import type { User } from "@/services/auth/auth.types";
import type { Conversation } from "@/services/conversations/conversation.types";
import type { Message } from "@/services/chat/chat.types";

export const mockDelay = (min = 200, max = 600): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, Math.floor(min + Math.random() * (max - min))),
  );

export const mockId = (prefix = "id"): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

const now = Date.now();
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

export const mockUsers: User[] = [
  {
    id: "user_demo",
    email: "demo@aster.app",
    name: "Demo User",
  },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv_welcome",
    title: "Welcome to Aster",
    createdAt: iso(1000 * 60 * 30),
    updatedAt: iso(1000 * 60 * 5),
  },
  {
    id: "conv_ideas",
    title: "Product ideas brainstorm",
    createdAt: iso(1000 * 60 * 60 * 24),
    updatedAt: iso(1000 * 60 * 60 * 22),
  },
  {
    id: "conv_recipe",
    title: "Weeknight dinner ideas",
    createdAt: iso(1000 * 60 * 60 * 24 * 3),
    updatedAt: iso(1000 * 60 * 60 * 24 * 3),
  },
];

export const mockMessages: Record<string, Message[]> = {
  conv_welcome: [
    {
      id: "m_welcome_1",
      conversationId: "conv_welcome",
      role: "assistant",
      content:
        "Hi, I'm Aster. Ask me anything — I can help you write, plan, learn, or think out loud.",
      createdAt: iso(1000 * 60 * 30),
      status: "complete",
    },
  ],
  conv_ideas: [
    {
      id: "m_ideas_1",
      conversationId: "conv_ideas",
      role: "user",
      content: "Help me brainstorm three product ideas around calm productivity.",
      createdAt: iso(1000 * 60 * 60 * 24),
      status: "complete",
    },
    {
      id: "m_ideas_2",
      conversationId: "conv_ideas",
      role: "assistant",
      content:
        "Sure — here are three angles:\n\n1. A minimal daily planner that only shows *today*.\n2. A focus timer that adapts to your calendar automatically.\n3. A weekly reflection journal with gentle prompts.",
      createdAt: iso(1000 * 60 * 60 * 24 + 4000),
      status: "complete",
    },
  ],
  conv_recipe: [],
};

const LOREM = [
  "Sure — ",
  "here's a quick take. ",
  "Let me think through this. ",
  "First, consider the core idea. ",
  "Then break it into small steps. ",
  "The trick is keeping momentum without overloading yourself. ",
  "Try starting with a five-minute version, ",
  "then expand once it feels natural. ",
  "Let me know if you'd like me to go deeper on any part.",
];

export function mockResponseTokens(prompt: string): string[] {
  const opener = `You said: "${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}". `;
  const body = LOREM.join("");
  return (opener + body).split(/(\s+)/).filter(Boolean);
}
