import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authService } from "./auth.service";

const sessionPayload = {
  session: { expiresAt: "2030-01-01T00:00:00.000Z" },
  user: {
    id: "user-1",
    email: "user@example.com",
    name: "Example User",
    image: "https://example.com/avatar.png",
  },
};

describe("HTTP authentication service", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("logs in with normalized credentials and loads the cookie-backed session", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ user: sessionPayload.user }))
      .mockResolvedValueOnce(Response.json(sessionPayload));

    await expect(
      authService.login({ email: " USER@Example.com ", password: "password123" }),
    ).resolves.toEqual({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Example User",
        avatarUrl: "https://example.com/avatar.png",
      },
      expiresAt: "2030-01-01T00:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/auth/sign-in/email",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
          rememberMe: true,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/get-session",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("signs up without inventing a session while email verification is pending", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ user: sessionPayload.user }))
      .mockResolvedValueOnce(Response.json(null));

    await expect(
      authService.signup({
        name: " Example User ",
        email: " USER@example.com ",
        password: "password123",
      }),
    ).resolves.toBeNull();

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      name: "Example User",
      email: "user@example.com",
      password: "password123",
      callbackURL: "/chat",
    });
  });

  it("logs out through Better Auth and notifies session subscribers", async () => {
    const listener = vi.fn();
    const unsubscribe = authService.onAuthChange(listener);
    fetchMock.mockResolvedValueOnce(Response.json({ success: true }));

    await authService.logout();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-out",
      expect.objectContaining({ method: "POST", body: "{}" }),
    );
    expect(listener).toHaveBeenCalledWith(null);
    unsubscribe();
  });

  it("restores an existing server session", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(sessionPayload));

    await expect(authService.getCurrentUser()).resolves.toMatchObject({
      user: { id: "user-1", email: "user@example.com" },
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
  });

  it("submits a generic forgot-password request to the internal reset page", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ status: true }));

    await authService.requestPasswordReset(" USER@example.com ");

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: "user@example.com",
      redirectTo: "/reset-password",
    });
  });

  it("requires a real reset token and sends it using Better Auth's request shape", async () => {
    await expect(
      authService.resetPassword({ token: "", password: "newpassword123" }),
    ).rejects.toThrow("Reset token is required");
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(Response.json({ status: true }));
    await authService.resetPassword({ token: "real-reset-token", password: "newpassword123" });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      token: "real-reset-token",
      newPassword: "newpassword123",
    });
  });
});
