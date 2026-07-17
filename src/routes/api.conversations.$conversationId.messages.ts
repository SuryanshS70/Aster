import { createFileRoute } from "@tanstack/react-router";

import { handleConversationMessagesRequest } from "../server/chat/chat.server";

export const Route = createFileRoute("/api/conversations/$conversationId/messages")({
  server: {
    handlers: {
      GET: ({ request, context, params }) =>
        handleConversationMessagesRequest(request, context.requestId, params.conversationId),
      POST: ({ request, context, params }) =>
        handleConversationMessagesRequest(request, context.requestId, params.conversationId),
    },
  },
});
