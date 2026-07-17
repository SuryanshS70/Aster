import { createFileRoute } from "@tanstack/react-router";

import { handleConversationRequest } from "../server/chat/chat.server";

export const Route = createFileRoute("/api/conversations/$conversationId")({
  server: {
    handlers: {
      GET: ({ request, context, params }) =>
        handleConversationRequest(request, context.requestId, params.conversationId),
      PATCH: ({ request, context, params }) =>
        handleConversationRequest(request, context.requestId, params.conversationId),
      DELETE: ({ request, context, params }) =>
        handleConversationRequest(request, context.requestId, params.conversationId),
    },
  },
});
