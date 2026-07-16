import { ApiError } from "./responses.server";

const methodsWithBodies = new Set(["POST", "PUT", "PATCH"]);

export function declaredBodyIsTooLarge(request: Request, limitBytes: number): boolean {
  if (!methodsWithBodies.has(request.method.toUpperCase())) return false;
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return false;
  const length = Number(contentLength);
  return Number.isFinite(length) && length > limitBytes;
}

export async function readJsonBody(request: Request, limitBytes: number): Promise<unknown> {
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limitBytes) {
        await reader.cancel();
        throw new ApiError(413, "CONTENT_TOO_LARGE", "Request body is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON");
  }
}
