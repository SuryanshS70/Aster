export type Role = "user" | "assistant" | "system";

export type MessageStatus = "pending" | "streaming" | "complete" | "error";

export type Message = {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  createdAt: string;
  status?: MessageStatus;
};

export type StreamChunk = { delta: string } | { done: true };

export type SendMessageInput = {
  conversationId: string;
  content: string;
};

export class MessageRateLimitError extends Error {
  constructor(message = "Rate limit exceeded") {
    super(message);
    this.name = "MessageRateLimitError";
  }
}

export interface ChatService {
  getMessages(conversationId: string): Promise<Message[]>;
  sendMessage(input: SendMessageInput): AsyncIterable<StreamChunk>;
  stopGeneration(conversationId: string): Promise<void>;
  regenerateResponse(conversationId: string): AsyncIterable<StreamChunk>;
}
