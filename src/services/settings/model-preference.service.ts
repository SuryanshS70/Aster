import { modelPreferenceSchema, type GeminiModel } from "@/contracts";

async function request(init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch("/api/settings/model", {
      ...init,
      credentials: "same-origin",
    });
  } catch {
    throw new Error("Model settings are temporarily unavailable. Please try again.");
  }

  if (!response.ok) {
    throw new Error("Unable to save your model preference. Please try again.");
  }
  return response.json();
}

export const modelPreferenceService = {
  async get() {
    return modelPreferenceSchema.parse(await request());
  },

  async update(model: GeminiModel) {
    const input = modelPreferenceSchema.parse({ model });
    return modelPreferenceSchema.parse(
      await request({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  },
};
