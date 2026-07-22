import { createFileRoute } from "@tanstack/react-router";

import { handleProjectsRequest } from "../server/projects/projects.server";

export const Route = createFileRoute("/api/projects")({
  server: {
    handlers: {
      GET: ({ request, context }) => handleProjectsRequest(request, context.requestId),
      POST: ({ request, context }) => handleProjectsRequest(request, context.requestId),
    },
  },
});
