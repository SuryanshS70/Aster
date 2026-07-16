import { describe, expect, it } from "vitest";
import { loginInputSchema, resetPasswordInputSchema, signupInputSchema } from "./auth";
import { createConversationInputSchema, renameConversationInputSchema } from "./conversations";
import { sendMessageInputSchema } from "./messages";

describe("shared validation contracts", () => {
  it("normalizes valid login input", () => {
    const input = loginInputSchema.parse({
      email: "  USER@Example.COM ",
      password: "password123",
    });

    expect(input.email).toBe("user@example.com");
  });

  it("validates signup and password-reset inputs", () => {
    expect(
      signupInputSchema.safeParse({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "long-enough-password",
      }).success,
    ).toBe(true);
    expect(
      resetPasswordInputSchema.safeParse({ token: "reset-token", password: "new-password" })
        .success,
    ).toBe(true);
  });

  it("validates conversation create and rename inputs", () => {
    expect(createConversationInputSchema.safeParse({}).success).toBe(true);
    expect(renameConversationInputSchema.safeParse({ title: "  Renamed chat  " }).success).toBe(
      true,
    );
    expect(renameConversationInputSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("rejects empty messages and unknown fields", () => {
    expect(
      sendMessageInputSchema.safeParse({ conversationId: "conv_welcome", content: "   " }).success,
    ).toBe(false);
    expect(
      loginInputSchema.safeParse({
        email: "user@example.com",
        password: "password123",
        admin: true,
      }).success,
    ).toBe(false);
  });
});
