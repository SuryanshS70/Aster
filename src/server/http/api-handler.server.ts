import { getLogger, toSafeError } from "../observability/logger.server";
import { ApiError, jsonErrorResponse } from "./responses.server";

export async function withApiErrorBoundary(
  requestId: string,
  handler: () => Promise<Response> | Response,
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonErrorResponse(error.status, error.code, error.publicMessage, requestId);
    }
    getLogger().error({ requestId, error: toSafeError(error) }, "API request failed");
    return jsonErrorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred",
      requestId,
    );
  }
}
