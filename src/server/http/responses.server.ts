export type ApiErrorCode =
  | "BAD_REQUEST"
  | "CONTENT_TOO_LARGE"
  | "INTERNAL_SERVER_ERROR"
  | "METHOD_NOT_ALLOWED"
  | "SERVICE_UNAVAILABLE";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = "ApiError";
  }
}

export function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return Response.json(payload, { ...init, headers });
}

export function jsonErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  requestId: string,
): Response {
  return jsonResponse({ error: { code, message, requestId } }, { status });
}
