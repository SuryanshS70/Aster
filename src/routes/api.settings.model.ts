import { createFileRoute } from "@tanstack/react-router";

import { handleModelPreferenceRequest } from "../server/settings/model-preference.server";

export const Route = createFileRoute("/api/settings/model")({
  server: {
    handlers: {
      GET: ({ request, context }) => handleModelPreferenceRequest(request, context.requestId),
      PATCH: ({ request, context }) => handleModelPreferenceRequest(request, context.requestId),
    },
  },
});
