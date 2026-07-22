import { describe, expect, it } from "vitest";
import { loginInputSchema, resetPasswordInputSchema, signupInputSchema } from "./auth";
import { createConversationInputSchema, renameConversationInputSchema } from "./conversations";
import { sendMessageInputSchema } from "./messages";
import { modelPreferenceSchema } from "./model-preference";
import { createProjectInputSchema, projectDocumentMimeTypeSchema } from "./projects";

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
  it("validates project names, descriptions, and document types", () => {
    expect(
      createProjectInputSchema.safeParse({
        name: "Research",
        description: "Notes for launch planning",
      }).success,
    ).toBe(true);
    expect(createProjectInputSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(projectDocumentMimeTypeSchema.safeParse("application/pdf").success).toBe(true);
    expect(projectDocumentMimeTypeSchema.safeParse("text/plain").success).toBe(true);
    expect(projectDocumentMimeTypeSchema.safeParse("text/html").success).toBe(false);
  });

  it("allows only approved Gemini model preferences", () => {
    expect(modelPreferenceSchema.safeParse({ model: "gemini-3.5-flash" }).success).toBe(true);
    expect(modelPreferenceSchema.safeParse({ model: "gemini-3.5-flash-lite" }).success).toBe(true);
    expect(modelPreferenceSchema.safeParse({ model: "gemini-2.5-flash-lite" }).success).toBe(true);
    expect(modelPreferenceSchema.safeParse({ model: "gemini-arbitrary" }).success).toBe(false);
    expect(
      modelPreferenceSchema.safeParse({ model: "gemini-3.5-flash", extra: true }).success,
    ).toBe(false);
  });
});
