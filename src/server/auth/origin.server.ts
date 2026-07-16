import { getServerEnv, getTrustedOrigins, type ServerEnv } from "../config/env.server";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutationRequest(request: Request): boolean {
  return mutationMethods.has(request.method.toUpperCase());
}

export function isTrustedRequestOrigin(request: Request, env: ServerEnv = getServerEnv()): boolean {
  if (!isMutationRequest(request)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return getTrustedOrigins(env).includes(new URL(origin).origin);
  } catch {
    return false;
  }
}
