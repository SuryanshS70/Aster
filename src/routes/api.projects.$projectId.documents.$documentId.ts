import { createFileRoute } from "@tanstack/react-router";

import { handleProjectDocumentRequest } from "../server/projects/projects.server";

export const Route = createFileRoute("/api/projects/$projectId/documents/$documentId")({
  server: {
    handlers: {
      DELETE: ({ request, context, params }) =>
        handleProjectDocumentRequest(
          request,
          context.requestId,
          params.projectId,
          params.documentId,
        ),
    },
  },
});
