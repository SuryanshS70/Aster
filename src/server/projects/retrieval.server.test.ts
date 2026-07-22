import { describe, expect, it } from "vitest";

import { retrieveRelevantContext, splitDocumentText } from "./retrieval.server";

describe("project document retrieval", () => {
  it("splits long text into bounded overlapping chunks", () => {
    const chunks = splitDocumentText("alpha ".repeat(700));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 1_400)).toBe(true);
  });

  it("selects relevant chunks without sending every full document", () => {
    const context = retrieveRelevantContext(
      [
        {
          filename: "launch.txt",
          text: "The launch date is October 4. The launch owner is Maya. " + "release ".repeat(500),
        },
        {
          filename: "unrelated.txt",
          text: "Catering notes and office furniture. ".repeat(500),
        },
      ],
      "What is the launch date?",
    );

    expect(context).toContain("[Source: launch.txt]");
    expect(context).toContain("October 4");
    expect(context.length).toBeLessThanOrEqual(5_800);
    expect(context).not.toContain("Catering notes");
  });
});
