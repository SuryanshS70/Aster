import { describe, expect, it, vi } from "vitest";

import { createAuthRequestHandler } from "./handler.server";

const baseUrl = "http://localhost:3000";

function post(path: string, body: unknown, origin = baseUrl) {
  return new Request(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

function createHandler(authHandler: (request: Request) => Promise<Response>) {
  return createAuthRequestHandler({
    authHandler,
    isTrustedOrigin: (request) => request.headers.get("origin") === baseUrl,
    bodyLimitBytes: 16_384,
  });
}

describe("authentication request boundary", () => {
  it("rejects untrusted mutation origins before authentication runs", async () => {
    const authHandler = vi.fn(async (_request: Request) => Response.json({ ok: true }));
    const response = await createHandler(authHandler)(
      post(
        "/api/auth/sign-in/email",
        { email: "u@example.com", password: "password1" },
        "https://evil.test",
      ),
      "request-1",
    );

    expect(response.status).toBe(403);
    expect(authHandler).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { message: "Request origin is not allowed", requestId: "request-1" },
    });
  });

  it("validates signup input and normalizes email before forwarding", async () => {
    const authHandler = vi.fn(async (_request: Request) => Response.json({ ok: true }));
    const handler = createHandler(authHandler);

    const invalidResponse = await handler(
      post("/api/auth/sign-up/email", { name: "", email: "bad", password: "short" }),
      "request-2",
    );
    expect(invalidResponse.status).toBe(400);
    expect(authHandler).not.toHaveBeenCalled();

    const validResponse = await handler(
      post("/api/auth/sign-up/email", {
        name: " User ",
        email: " USER@Example.COM ",
        password: "password1",
      }),
      "request-3",
    );
    expect(validResponse.status).toBe(200);
    const forwarded = authHandler.mock.calls[0]?.[0];
    await expect(forwarded?.json()).resolves.toMatchObject({
      name: "User",
      email: "user@example.com",
    });
  });

  it("returns the same generic error for unknown accounts and incorrect passwords", async () => {
    const handler = createHandler(async () =>
      Response.json({ message: "sensitive upstream detail" }, { status: 401 }),
    );
    const requestBody = { email: "person@example.com", password: "incorrect1" };

    const unknown = await handler(post("/api/auth/sign-in/email", requestBody), "unknown");
    const incorrect = await handler(post("/api/auth/sign-in/email", requestBody), "incorrect");
    const unknownBody = (await unknown.json()) as { error: { message: string } };
    const incorrectBody = (await incorrect.json()) as { error: { message: string } };

    expect(unknown.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(unknownBody.error.message).toBe("Invalid email or password");
    expect(incorrectBody.error.message).toBe(unknownBody.error.message);
  });

  it("uses a generic forgot-password response and rejects external redirects", async () => {
    const authHandler = vi.fn(async (_request: Request) =>
      Response.json({ message: "not found" }, { status: 404 }),
    );
    const handler = createHandler(authHandler);

    const generic = await handler(
      post("/api/auth/request-password-reset", { email: "missing@example.com" }),
      "request-4",
    );
    expect(generic.status).toBe(200);
    await expect(generic.json()).resolves.toEqual({ status: true });

    const invalidRedirect = await handler(
      post("/api/auth/request-password-reset", {
        email: "person@example.com",
        redirectTo: "https://evil.test/reset",
      }),
      "request-5",
    );
    expect(invalidRedirect.status).toBe(400);
    expect(authHandler).toHaveBeenCalledTimes(1);
  });
});
