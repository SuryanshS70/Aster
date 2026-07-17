import { describe, expect, it } from "vitest";
import { chatService, conversationService } from "@/services";

describe("mock service layer", () => {
  it("loads seeded conversations and messages", async () => {
    const conversations = await conversationService.getConversations();
    const welcome = conversations.find((conversation) => conversation.id === "conv_welcome");

    expect(welcome?.title).toBe("Welcome to Aster");
    await expect(chatService.getMessages("conv_welcome")).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ role: "assistant", status: "complete" })]),
    );
  });
});
