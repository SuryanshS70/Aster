import { describe, expect, it, vi } from "vitest";

import { createAuthRateLimitStorage } from "./rate-limit.server";

describe("Redis authentication rate-limit storage", () => {
  it("stores Better Auth counters with a TTL and safely reads them", async () => {
    const values = new Map<string, string>();
    const get = vi.fn(async (key: string) => values.get(key) ?? null);
    const set = vi.fn(async (key: string, value: string) => {
      values.set(key, value);
      return "OK" as const;
    });
    const del = vi.fn(async (key: string) => (values.delete(key) ? 1 : 0));
    const storage = createAuthRateLimitStorage(
      async () => ({ get, set, del }) as never,
      "test:auth-rate:",
      60,
    );
    const counter = { key: "ip", count: 2, lastRequest: 123 };

    await storage.set("login", counter, true);

    expect(set).toHaveBeenCalledWith("test:auth-rate:login", JSON.stringify(counter), { EX: 60 });
    await expect(storage.get("login")).resolves.toEqual(counter);
  });

  it("treats malformed Redis data as a cache miss", async () => {
    const storage = createAuthRateLimitStorage(
      async () => ({ get: async () => "not-json", set: vi.fn(), del: vi.fn() }) as never,
      "test:auth-rate:",
    );

    await expect(storage.get("login")).resolves.toBeNull();
  });
});
