import { createFileRoute } from "@tanstack/react-router";

import { handleAuthRequest } from "../server/auth/handler.server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request, context }) => handleAuthRequest(request, context.requestId),
      POST: ({ request, context }) => handleAuthRequest(request, context.requestId),
    },
  },
});
