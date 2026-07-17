import { z } from "zod";
import { conversationIdSchema } from "./conversations";

export const messageIdSchema = z
  .string()
  .trim()
  .min(1, "Message ID is required")
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Message ID contains invalid characters");

export const messageContentSchema = z
  .string()
  .max(32_000, "Message must be 32,000 characters or fewer")
  .refine((content) => content.trim().length > 0, "Message cannot be empty");

export const roleSchema = z.enum(["user", "assistant"]);
export const messageStatusSchema = z.enum(["pending", "streaming", "complete", "error"]);

export const sendMessageInputSchema = z
  .object({
    conversationId: conversationIdSchema,
    content: messageContentSchema,
  })
  .strict();

export const createMessageInputSchema = z
  .object({
    role: roleSchema,
    content: messageContentSchema,
  })
  .strict();

export const messageSchema = z
  .object({
    id: messageIdSchema,
    conversationId: conversationIdSchema,
    role: roleSchema,
    content: z.string().max(32_000),
    createdAt: z.string().datetime({ offset: true }),
    status: messageStatusSchema.optional(),
  })
  .strict();

export const messageListSchema = z.array(messageSchema);

export const streamChunkSchema = z.union([
  z.object({ delta: z.string() }).strict(),
  z.object({ done: z.literal(true) }).strict(),
]);

export type Role = z.infer<typeof roleSchema>;
export type MessageStatus = z.infer<typeof messageStatusSchema>;
export type Message = z.infer<typeof messageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;
export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;
export type StreamChunk = z.infer<typeof streamChunkSchema>;
