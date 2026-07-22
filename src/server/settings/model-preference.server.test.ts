import { describe, expect, it } from "vitest";

import { DEFAULT_GEMINI_MODEL, type GeminiModel } from "../../contracts";
import { createModelPreferenceApi, type ModelPreferenceStore } from "./model-preference.server";

class MemoryModelPreferenceStore implements ModelPreferenceStore {
  private readonly models = new Map<string, GeminiModel>([
    ["user-a", DEFAULT_GEMINI_MODEL],
    ["user-b", "gemini-3.5-flash-lite"],
  ]);

  async get(userId: string) {
    return this.models.get(userId) ?? null;
  }

  async update(userId: string, model: GeminiModel) {
    if (!this.models.has(userId)) return null;
    this.models.set(userId, model);
    return model;
  }
}

function request(method: string, userId?: string, body?: unknown) {
  return new Request("http://localhost/api/settings/model", {
    method,
    headers: {
      ...(userId ? { "x-test-user": userId } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function setup() {
  const store = new MemoryModelPreferenceStore();
  const api = createModelPreferenceApi({
    store,
    resolveUserId: async (incoming) => incoming.headers.get("x-test-user"),
    bodyLimitBytes: 4_096,
  });
  return { api, store };
}

describe("authenticated model preference API", () => {
  it("rejects unauthenticated requests", async () => {
    const { api } = setup();
    const response = await api.handle(request("GET"), "anonymous-model-preference");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns the default and updates only the authenticated user's preference", async () => {
    const { api, store } = setup();

    const initial = await api.handle(request("GET", "user-a"), "get-model-preference");
    await expect(initial.json()).resolves.toEqual({ model: DEFAULT_GEMINI_MODEL });

    const updated = await api.handle(
      request("PATCH", "user-a", { model: "gemini-2.5-flash-lite" }),
      "update-model-preference",
    );
    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toEqual({ model: "gemini-2.5-flash-lite" });
    await expect(store.get("user-a")).resolves.toBe("gemini-2.5-flash-lite");
    await expect(store.get("user-b")).resolves.toBe("gemini-3.5-flash-lite");
  });

  it("rejects model IDs outside the server allowlist", async () => {
    const { api, store } = setup();
    const response = await api.handle(
      request("PATCH", "user-a", { model: "gemini-arbitrary" }),
      "invalid-model-preference",
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "BAD_REQUEST" },
    });
    await expect(store.get("user-a")).resolves.toBe(DEFAULT_GEMINI_MODEL);
  });
});
