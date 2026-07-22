import { createFileRoute } from "@tanstack/react-router";

import { handleProjectDocumentsRequest } from "../server/projects/projects.server";

export const Route = createFileRoute("/api/projects/$projectId/documents")({
  server: {
    handlers: {
      GET: ({ request, context, params }) =>
        handleProjectDocumentsRequest(request, context.requestId, params.projectId),
      POST: ({ request, context, params }) =>
        handleProjectDocumentsRequest(request, context.requestId, params.projectId),
    },
  },
});
