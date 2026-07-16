import { getServerEnv } from "../config/env.server";
import { getLogger, toSafeError } from "../observability/logger.server";
import { declaredBodyIsTooLarge } from "./body.server";
import { jsonErrorResponse } from "./responses.server";
import { applySecurityHeaders } from "./security-headers.server";

const validRequestId = /^[a-zA-Z0-9._-]{8,128}$/;

type MiddlewareResult = { response: Response };

export async function handleInfrastructureRequest<T extends MiddlewareResult>(
  {
    request,
    pathname,
    next,
  }: {
    request: Request;
    pathname: string;
    next: (requestId: string) => Promise<T> | T;
  },
  renderErrorPage: () => string,
): Promise<T | Response> {
  const env = getServerEnv();
  const receivedRequestId = request.headers.get("x-request-id");
  const requestId =
    receivedRequestId && validRequestId.test(receivedRequestId)
      ? receivedRequestId
      : crypto.randomUUID();
  const logger = getLogger().child({ requestId, method: request.method, pathname });
  const startedAt = performance.now();

  try {
    if (declaredBodyIsTooLarge(request, env.REQUEST_BODY_LIMIT_BYTES)) {
      return applySecurityHeaders(
        jsonErrorResponse(413, "CONTENT_TOO_LARGE", "Request body is too large", requestId),
        requestId,
        env.NODE_ENV === "production",
      );
    }

    const result = await next(requestId);
    const response = applySecurityHeaders(
      result.response,
      requestId,
      env.NODE_ENV === "production",
    );
    logger.info(
      {
        statusCode: response.status,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      },
      "request completed",
    );
    return { ...result, response };
  } catch (error) {
    logger.error({ error: toSafeError(error) }, "request failed");
    const response = pathname.startsWith("/api/")
      ? jsonErrorResponse(500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", requestId)
      : new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
    return applySecurityHeaders(response, requestId, env.NODE_ENV === "production");
  }
}
