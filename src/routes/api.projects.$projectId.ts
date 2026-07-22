import { createFileRoute } from "@tanstack/react-router";

import { handleProjectRequest } from "../server/projects/projects.server";

export const Route = createFileRoute("/api/projects/$projectId")({
  server: {
    handlers: {
      GET: ({ request, context, params }) =>
        handleProjectRequest(request, context.requestId, params.projectId),
      PATCH: ({ request, context, params }) =>
        handleProjectRequest(request, context.requestId, params.projectId),
      DELETE: ({ request, context, params }) =>
        handleProjectRequest(request, context.requestId, params.projectId),
    },
  },
});
