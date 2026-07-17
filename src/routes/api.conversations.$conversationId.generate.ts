import { createFileRoute } from "@tanstack/react-router";

import { handleConversationGenerationRequest } from "../server/chat/chat.server";

export const Route = createFileRoute("/api/conversations/$conversationId/generate")({
  server: {
    handlers: {
      POST: ({ request, context, params }) =>
        handleConversationGenerationRequest(request, context.requestId, params.conversationId),
    },
  },
});
