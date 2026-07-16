import { betterAuth, type BetterAuthRateLimitStorage } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";
import { beforeEach, describe, expect, it } from "vitest";

import { createAuthRequestHandler } from "./handler.server";

const origin = "http://localhost:3000";
const secret = "test-session-secret-at-least-thirty-two-characters";

type Email = { kind: "verification" | "reset"; url: string };

function createMemoryRateLimitStorage(): BetterAuthRateLimitStorage {
  const values = new Map<string, { key: string; count: number; lastRequest: number }>();
  return {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    },
    consume: async (key, rule) => {
      const now = Date.now();
      const value = values.get(key);
      if (!value || now - value.lastRequest >= rule.window * 1_000) {
        values.set(key, { key, count: 1, lastRequest: now });
        return { allowed: true, retryAfter: null };
      }
      if (value.count >= rule.max) {
        return {
          allowed: false,
          retryAfter: Math.max(
            1,
            Math.ceil((rule.window * 1_000 - (now - value.lastRequest)) / 1_000),
          ),
        };
      }
      value.count += 1;
      return { allowed: true, retryAfter: null };
    },
  };
}

function setup(maxSignIn = 20) {
  const db: MemoryDB = { user: [], session: [], account: [], verification: [] };
  const emails: Email[] = [];
  const auth = betterAuth({
    appName: "Aster test",
    baseURL: origin,
    basePath: "/api/auth",
    secret,
    database: memoryAdapter(db),
    trustedOrigins: [origin],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ url }) => {
        emails.push({ kind: "reset", url });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ url }) => {
        emails.push({ kind: "verification", url });
      },
    },
    rateLimit: {
      enabled: true,
      customStorage: createMemoryRateLimitStorage(),
      customRules: { "/sign-in/email": { window: 60, max: maxSignIn } },
    },
    advanced: {
      cookiePrefix: "aster",
      useSecureCookies: false,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
  });
  const handler = createAuthRequestHandler({
    authHandler: auth.handler,
    isTrustedOrigin: (request) =>
      request.method === "GET" || request.headers.get("origin") === origin,
    bodyLimitBytes: 16_384,
  });
  return { db, emails, auth, handler };
}

function post(path: string, body: unknown, cookie?: string) {
  const headers = new Headers({
    "content-type": "application/json",
    origin,
    "x-forwarded-for": "127.0.0.1",
  });
  if (cookie) headers.set("cookie", cookie);
  return new Request(`${origin}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

function get(pathOrUrl: string, cookie?: string) {
  const headers = new Headers({ "x-forwarded-for": "127.0.0.1" });
  if (cookie) headers.set("cookie", cookie);
  return new Request(pathOrUrl.startsWith("http") ? pathOrUrl : `${origin}${pathOrUrl}`, {
    headers,
  });
}

function cookieFrom(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/(?:^|,\s*)(aster\.session_token=[^;]+)/);
  if (!match?.[1]) throw new Error("Expected a session cookie");
  return match[1];
}

async function signupAndVerify(
  handler: ReturnType<typeof createAuthRequestHandler>,
  emails: Email[],
) {
  const signup = await handler(
    post("/api/auth/sign-up/email", {
      name: "Example User",
      email: "USER@Example.com",
      password: "password1",
    }),
    "signup",
  );
  expect(signup.status).toBe(200);
  const verificationUrl = emails.find((email) => email.kind === "verification")?.url;
  if (!verificationUrl) throw new Error("Expected a verification email");
  const verified = await handler(get(verificationUrl), "verify");
  expect([200, 302]).toContain(verified.status);
  return cookieFrom(verified);
}

describe("Better Auth backend integration", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  it("normalizes unique emails, verifies email, restores a database session, and revokes it on logout", async () => {
    const { db, emails, handler } = setup();
    const cookie = await signupAndVerify(handler, emails);

    expect(db.user).toHaveLength(1);
    expect(db.user?.[0]?.email).toBe("user@example.com");
    expect(db.session).toHaveLength(1);

    const duplicate = await handler(
      post("/api/auth/sign-up/email", {
        name: "Duplicate",
        email: "user@example.com",
        password: "password2",
      }),
      "duplicate",
    );
    expect(duplicate.status).toBe(200);
    expect(db.user).toHaveLength(1);

    const session = await handler(get("/api/auth/get-session", cookie), "session");
    await expect(session.json()).resolves.toMatchObject({ user: { email: "user@example.com" } });

    const logout = await handler(post("/api/auth/sign-out", {}, cookie), "logout");
    expect(logout.status).toBe(200);
    const revoked = await handler(get("/api/auth/get-session", cookie), "revoked");
    expect(await revoked.json()).toBeNull();
  });

  it("rejects invalid and reused reset tokens and revokes existing sessions after reset", async () => {
    const { emails, handler } = setup();
    const cookie = await signupAndVerify(handler, emails);

    const requested = await handler(
      post("/api/auth/request-password-reset", {
        email: "user@example.com",
        redirectTo: "/reset-password",
      }),
      "forgot",
    );
    expect(requested.status).toBe(200);
    const resetUrl = emails.find((email) => email.kind === "reset")?.url;
    if (!resetUrl) throw new Error("Expected a reset email");
    const parsedResetUrl = new URL(resetUrl);
    const token =
      parsedResetUrl.searchParams.get("token") ??
      parsedResetUrl.pathname.split("/").filter(Boolean).at(-1);
    if (!token) throw new Error("Expected a reset token");

    const invalid = await handler(
      post("/api/auth/reset-password", { token: "invalid-token", newPassword: "newpassword1" }),
      "invalid-reset",
    );
    expect(invalid.status).toBe(400);

    const reset = await handler(
      post("/api/auth/reset-password", { token, newPassword: "newpassword1" }),
      "reset",
    );
    expect(reset.status).toBe(200);
    const reused = await handler(
      post("/api/auth/reset-password", { token, newPassword: "anotherpassword1" }),
      "reused-reset",
    );
    expect(reused.status).toBe(400);

    const revoked = await handler(get("/api/auth/get-session", cookie), "reset-revoked");
    expect(await revoked.json()).toBeNull();
  });

  it("rate limits repeated authentication attempts", async () => {
    const { handler } = setup(1);
    const credentials = { email: "missing@example.com", password: "password1" };
    const first = await handler(post("/api/auth/sign-in/email", credentials), "rate-1");
    const second = await handler(post("/api/auth/sign-in/email", credentials), "rate-2");

    expect(first.status).toBe(401);
    expect(second.status).toBe(429);
  });
});
