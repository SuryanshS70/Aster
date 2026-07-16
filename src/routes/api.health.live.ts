import { createFileRoute } from "@tanstack/react-router";

import { handleLiveHealthRequest } from "../server/health/health.server";

export const Route = createFileRoute("/api/health/live")({
  server: {
    handlers: {
      GET: ({ context }) => handleLiveHealthRequest(context.requestId),
    },
  },
});
