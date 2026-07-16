import { createFileRoute } from "@tanstack/react-router";

import { handleReadyHealthRequest } from "../server/health/health.server";

export const Route = createFileRoute("/api/health/ready")({
  server: {
    handlers: {
      GET: ({ context }) => handleReadyHealthRequest(context.requestId),
    },
  },
});
