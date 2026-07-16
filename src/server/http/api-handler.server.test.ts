import { describe, expect, it, vi } from "vitest";

vi.mock("../observability/logger.server", () => ({
  getLogger: () => ({ error: vi.fn() }),
  toSafeError: () => ({ name: "Error" }),
}));

import { withApiErrorBoundary } from "./api-handler.server";
import { ApiError } from "./responses.server";

describe("controlled API errors", () => {
  it("does not expose unexpected exception details", async () => {
    const response = await withApiErrorBoundary("request-123", () => {
      throw new Error("database password is secret");
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        requestId: "request-123",
      },
    });
  });

  it("returns the controlled status and public message for ApiError", async () => {
    const response = await withApiErrorBoundary("request-456", () => {
      throw new ApiError(400, "BAD_REQUEST", "The request is invalid");
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "The request is invalid",
        requestId: "request-456",
      },
    });
  });
});
