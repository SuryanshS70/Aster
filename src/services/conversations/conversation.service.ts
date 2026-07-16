import type { ConversationService } from "./conversation.types";
import { mockConversationService } from "./mock-conversation.service";

export const conversationService: ConversationService = mockConversationService;
