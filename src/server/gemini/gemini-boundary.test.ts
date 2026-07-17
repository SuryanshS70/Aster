import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Gemini client boundary", () => {
  it("keeps Gemini SDK and secrets out of the browser chat service", async () => {
    const clientSource = await readFile(
      new URL("../../services/chat/chat.service.ts", import.meta.url),
      "utf8",
    );
    expect(clientSource).not.toContain("@google/genai");
    expect(clientSource).not.toContain("GEMINI_API_KEY");
    expect(clientSource).not.toContain("GEMINI_MODEL");
  });
});
