import { createFileRoute } from "@tanstack/react-router";

import { handleConversationRegenerationRequest } from "../server/chat/chat.server";

export const Route = createFileRoute("/api/conversations/$conversationId/regenerate")({
  server: {
    handlers: {
      POST: ({ request, context, params }) =>
        handleConversationRegenerationRequest(request, context.requestId, params.conversationId),
    },
  },
});
