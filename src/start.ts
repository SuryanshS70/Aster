import { createMiddleware, createStart } from "@tanstack/react-start";

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

export const startInstance = createStart(() => ({
  requestMiddleware: [infrastructureMiddleware],
}));
