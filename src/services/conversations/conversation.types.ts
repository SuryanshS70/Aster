export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateConversationInput = { title?: string };

export class ConversationNotFoundError extends Error {
  constructor(message = "Conversation not found") {
    super(message);
    this.name = "ConversationNotFoundError";
  }
}

export interface ConversationService {
  getConversations(): Promise<Conversation[]>;
  createConversation(input?: CreateConversationInput): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation>;
  renameConversation(id: string, title: string): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
}
