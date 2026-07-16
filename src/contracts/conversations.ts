import { z } from "zod";

export const conversationIdSchema = z
  .string()
  .trim()
  .min(1, "Conversation ID is required")
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Conversation ID contains invalid characters");

export const conversationTitleSchema = z
  .string()
  .trim()
  .min(1, "Conversation title is required")
  .max(120, "Conversation title must be 120 characters or fewer");

export const createConversationInputSchema = z
  .object({
    title: conversationTitleSchema.optional(),
  })
  .strict();

export const renameConversationInputSchema = z
  .object({
    title: conversationTitleSchema,
  })
  .strict();

export const conversationSchema = z
  .object({
    id: conversationIdSchema,
    title: conversationTitleSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const conversationListSchema = z.array(conversationSchema);

export type Conversation = z.infer<typeof conversationSchema>;
export type CreateConversationInput = z.infer<typeof createConversationInputSchema>;
export type RenameConversationInput = z.infer<typeof renameConversationInputSchema>;
