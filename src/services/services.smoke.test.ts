import { describe, expect, it } from "vitest";
import { authService, chatService, conversationService } from "@/services";

describe("mock service layer", () => {
  it("supports the existing auth contract", async () => {
    const session = await authService.login({
      email: "smoke@example.com",
      password: "password123",
    });

    expect(session.user.email).toBe("smoke@example.com");
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("loads seeded conversations and messages", async () => {
    const conversations = await conversationService.getConversations();
    const welcome = conversations.find((conversation) => conversation.id === "conv_welcome");

    expect(welcome?.title).toBe("Welcome to Aster");
    await expect(chatService.getMessages("conv_welcome")).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ role: "assistant", status: "complete" })]),
    );
  });
});
