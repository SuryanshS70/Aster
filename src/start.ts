import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const infrastructureMiddleware = createMiddleware().server(async ({ request, pathname, next }) => {
  const { handleInfrastructureRequest } = await import("./server/http/middleware.server");
  return handleInfrastructureRequest(
    {
      request,
      pathname,
      next: (requestId) => next({ context: { requestId } }),
    },
    renderErrorPage,
  );
});

const csrfMiddleware = createCsrfMiddleware({
  filter: ({ request }) => ["POST", "PUT", "PATCH", "DELETE"].includes(request.method),
  secFetchSite: "same-origin",
  allowRequestsWithoutOriginCheck: false,
  failureResponse: Response.json(
    { error: { code: "CSRF_REJECTED", message: "Request origin is not allowed" } },
    { status: 403 },
  ),
});

export const startInstance = createStart(() => ({
  requestMiddleware: [infrastructureMiddleware, csrfMiddleware],
}));
