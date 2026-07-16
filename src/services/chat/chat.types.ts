import type {
  Message,
  MessageStatus,
  Role,
  SendMessageInput,
  StreamChunk,
} from "@/contracts/messages";

export type {
  Message,
  MessageStatus,
  Role,
  SendMessageInput,
  StreamChunk,
} from "@/contracts/messages";

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
