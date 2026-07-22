import { describe, expect, it, vi } from "vitest";

vi.mock("pdf-parse", () => ({
  PDFParse: class {
    async getText() {
      return { text: "Extracted PDF text" };
    }

    async destroy() {
      return undefined;
    }
  },
}));

import {
  DocumentProcessingError,
  extractDocumentText,
  validateDocumentUpload,
} from "./document-processing.server";

describe("project document processing", () => {
  it("extracts UTF-8 plain text", async () => {
    const upload = await validateDocumentUpload(
      new File(["Project facts"], "facts.txt", { type: "text/plain" }),
    );
    await expect(extractDocumentText(upload)).resolves.toBe("Project facts");
  });

  it("accepts a PDF signature and extracts text on the server", async () => {
    const upload = await validateDocumentUpload(
      new File(["%PDF-test"], "facts.pdf", { type: "application/pdf" }),
    );
    await expect(extractDocumentText(upload)).resolves.toBe("Extracted PDF text");
  });

  it("rejects unsupported file types and false PDF content", async () => {
    await expect(
      validateDocumentUpload(new File(["data"], "data.csv", { type: "text/csv" })),
    ).rejects.toBeInstanceOf(DocumentProcessingError);

    const upload = await validateDocumentUpload(
      new File(["not a pdf"], "fake.pdf", { type: "application/pdf" }),
    );
    await expect(extractDocumentText(upload)).rejects.toMatchObject({
      publicMessage: "The uploaded file is not a valid PDF.",
    });
  });
});
