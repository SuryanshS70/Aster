import { createFileRoute } from "@tanstack/react-router";

import { handleConversationsRequest } from "../server/chat/chat.server";

export const Route = createFileRoute("/api/conversations")({
  server: {
    handlers: {
      GET: ({ request, context }) => handleConversationsRequest(request, context.requestId),
      POST: ({ request, context }) => handleConversationsRequest(request, context.requestId),
    },
  },
});
