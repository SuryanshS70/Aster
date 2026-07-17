import {
  loginInputSchema,
  passwordResetRequestSchema,
  resetPasswordInputSchema,
  signupInputSchema,
} from "@/contracts/auth";
import type { AuthChangeListener, AuthService, Session } from "./auth.types";
import { RateLimitError, UnauthorizedError } from "./auth.types";

const listeners = new Set<AuthChangeListener>();

function notify(session: Session | null) {
  listeners.forEach((listener) => listener(session));
}

async function request(path: string, body?: Record<string, unknown>): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Authentication is temporarily unavailable. Please try again.");
  }

  if (response.status === 429) {
    throw new RateLimitError("Too many attempts. Please try again later.");
  }
  return response;
}

function parseSession(value: unknown): Session | null {
  if (value === null) return null;
  if (!value || typeof value !== "object") throw new Error("Unable to verify your session.");

  const payload = value as Record<string, unknown>;
  const rawSession = payload.session;
  const rawUser = payload.user;
  if (!rawSession || typeof rawSession !== "object" || !rawUser || typeof rawUser !== "object") {
    throw new Error("Unable to verify your session.");
  }

  const session = rawSession as Record<string, unknown>;
  const user = rawUser as Record<string, unknown>;
  if (
    typeof session.expiresAt !== "string" ||
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.name !== "string"
  ) {
    throw new Error("Unable to verify your session.");
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      ...(typeof user.image === "string" ? { avatarUrl: user.image } : {}),
    },
    expiresAt: session.expiresAt,
  };
}

async function getCurrentUser(): Promise<Session | null> {
  const response = await request("get-session");
  if (!response.ok) throw new Error("Unable to verify your session.");
  return parseSession(await response.json());
}

export const authService: AuthService = {
  getCurrentUser,

  async login(input) {
    const validated = loginInputSchema.parse(input);
    const response = await request("sign-in/email", { ...validated, rememberMe: true });
    if (!response.ok) throw new UnauthorizedError("Invalid email or password.");

    const session = await getCurrentUser();
    if (!session) throw new UnauthorizedError("Invalid email or password.");
    notify(session);
    return session;
  },

  async signup(input) {
    const validated = signupInputSchema.parse(input);
    const response = await request("sign-up/email", { ...validated, callbackURL: "/chat" });
    if (!response.ok) throw new Error("Unable to create your account. Please try again.");

    const session = await getCurrentUser();
    if (session) notify(session);
    return session;
  },

  async logout() {
    const response = await request("sign-out", {});
    if (!response.ok) throw new Error("Unable to sign out. Please try again.");
    notify(null);
  },

  async requestPasswordReset(email) {
    const validated = passwordResetRequestSchema.parse({ email });
    const response = await request("request-password-reset", {
      ...validated,
      redirectTo: "/reset-password",
    });
    if (!response.ok) throw new Error("Unable to send a reset link. Please try again.");
  },

  async resetPassword(input) {
    const validated = resetPasswordInputSchema.parse(input);
    const response = await request("reset-password", {
      token: validated.token,
      newPassword: validated.password,
    });
    if (!response.ok) throw new Error("Reset link is invalid or expired.");
    notify(null);
  },

  onAuthChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
