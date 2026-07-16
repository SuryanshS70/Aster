import {
  loginInputSchema,
  passwordResetRequestSchema,
  resetPasswordInputSchema,
  signupInputSchema,
} from "../../contracts/auth";
import { getServerEnv } from "../config/env.server";
import { readJsonBody } from "../http/body.server";
import { jsonErrorResponse, jsonResponse } from "../http/responses.server";
import { isTrustedRequestOrigin } from "./origin.server";

type AuthHandler = (request: Request) => Promise<Response>;

type HandlerOptions = {
  authHandler: AuthHandler;
  isTrustedOrigin?: (request: Request) => boolean;
  bodyLimitBytes?: number;
};

export function createAuthRequestHandler({
  authHandler,
  isTrustedOrigin = isTrustedRequestOrigin,
  bodyLimitBytes = getServerEnv().REQUEST_BODY_LIMIT_BYTES,
}: HandlerOptions) {
  return async (request: Request, requestId: string): Promise<Response> => {
    if (!isTrustedOrigin(request)) {
      return jsonErrorResponse(403, "BAD_REQUEST", "Request origin is not allowed", requestId);
    }

    const pathname = new URL(request.url).pathname;
    let forwardedRequest = request;
    if (request.method === "POST" && requiresValidatedBody(pathname)) {
      const body = await readJsonBody(request, bodyLimitBytes);
      const validated = validateAuthBody(pathname, body);
      if (!validated.success) {
        return jsonErrorResponse(400, "BAD_REQUEST", validated.message, requestId);
      }
      const headers = new Headers(request.headers);
      headers.set("content-type", "application/json");
      forwardedRequest = new Request(request.url, {
        method: request.method,
        headers,
        body: JSON.stringify(validated.body),
      });
    }

    const response = await authHandler(forwardedRequest);
    if (response.status === 429 || response.ok) return response;

    if (pathname.endsWith("/sign-in/email")) {
      return jsonErrorResponse(401, "BAD_REQUEST", "Invalid email or password", requestId);
    }
    if (pathname.endsWith("/sign-up/email")) {
      return jsonErrorResponse(400, "BAD_REQUEST", "Unable to create account", requestId);
    }
    if (pathname.endsWith("/reset-password")) {
      return jsonErrorResponse(400, "BAD_REQUEST", "Reset link is invalid or expired", requestId);
    }
    if (pathname.endsWith("/request-password-reset") && response.status < 500) {
      return jsonResponse({ status: true });
    }
    return response;
  };
}

export async function handleAuthRequest(request: Request, requestId: string): Promise<Response> {
  const { auth } = await import("./auth.server");
  return createAuthRequestHandler({ authHandler: auth.handler })(request, requestId);
}

function requiresValidatedBody(pathname: string): boolean {
  return [
    "/api/auth/sign-in/email",
    "/api/auth/sign-up/email",
    "/api/auth/request-password-reset",
    "/api/auth/reset-password",
  ].some((path) => pathname.endsWith(path));
}

function validateAuthBody(
  pathname: string,
  body: unknown,
): { success: true; body: Record<string, unknown> } | { success: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { success: false, message: "Request body is invalid" };
  }
  const input = body as Record<string, unknown>;
  const callbackURL = validateRedirect(input.callbackURL);

  if (pathname.endsWith("/sign-in/email")) {
    const result = loginInputSchema.safeParse({ email: input.email, password: input.password });
    if (!result.success) return invalid(result.error.issues[0]?.message);
    return {
      success: true,
      body: {
        ...result.data,
        rememberMe: input.rememberMe !== false,
        ...(callbackURL ? { callbackURL } : {}),
      },
    };
  }
  if (pathname.endsWith("/sign-up/email")) {
    const result = signupInputSchema.safeParse({
      name: input.name,
      email: input.email,
      password: input.password,
    });
    if (!result.success) return invalid(result.error.issues[0]?.message);
    return {
      success: true,
      body: { ...result.data, ...(callbackURL ? { callbackURL } : {}) },
    };
  }
  if (pathname.endsWith("/request-password-reset")) {
    const result = passwordResetRequestSchema.safeParse({ email: input.email });
    if (!result.success) return invalid(result.error.issues[0]?.message);
    const redirectTo = validateRedirect(input.redirectTo);
    if (input.redirectTo && !redirectTo) return invalid("Redirect destination is invalid");
    return {
      success: true,
      body: { ...result.data, ...(redirectTo ? { redirectTo } : {}) },
    };
  }
  const result = resetPasswordInputSchema.safeParse({
    token: input.token,
    password: input.newPassword,
  });
  if (!result.success) return invalid(result.error.issues[0]?.message);
  return { success: true, body: { token: result.data.token, newPassword: result.data.password } };
}

function validateRedirect(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return undefined;
  }
  return value;
}

function invalid(message = "Request body is invalid") {
  return { success: false as const, message };
}
