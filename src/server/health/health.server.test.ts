import { describe, expect, it, vi } from "vitest";

vi.mock("../observability/logger.server", () => ({
  getLogger: () => ({ child: () => ({ warn: vi.fn() }), error: vi.fn() }),
  toSafeError: () => ({ name: "Error" }),
}));

import { createReadyHealthHandler, handleLiveHealthRequest } from "./health.server";

describe("health routes", () => {
  it("returns a live response without checking dependencies", async () => {
    const response = await handleLiveHealthRequest("request-live");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("returns ready when PostgreSQL and Redis are reachable", async () => {
    const handler = createReadyHealthHandler({
      checkDatabase: vi.fn().mockResolvedValue(undefined),
      checkRedis: vi.fn().mockResolvedValue(undefined),
    });
    const response = await handler("request-ready");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ready",
      checks: { database: "ok", redis: "ok" },
    });
  });

  it("returns a controlled failure without connection details", async () => {
    const handler = createReadyHealthHandler({
      checkDatabase: vi.fn().mockRejectedValue(new Error("postgresql://user:secret@db")),
      checkRedis: vi.fn().mockResolvedValue(undefined),
    });
    const response = await handler("request-not-ready");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "not_ready",
      checks: { database: "unavailable", redis: "ok" },
    });
  });
});
