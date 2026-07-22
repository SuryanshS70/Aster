import { PDFParse } from "pdf-parse";

import {
  MAX_DOCUMENT_FILE_BYTES,
  projectDocumentMimeTypeSchema,
  type ProjectDocumentMimeType,
} from "../../contracts/projects";

const MAX_EXTRACTED_TEXT_CHARACTERS = 2_000_000;
const PDF_SIGNATURE = "%PDF-";

export class DocumentProcessingError extends Error {
  constructor(readonly publicMessage: string) {
    super(publicMessage);
    this.name = "DocumentProcessingError";
  }
}

export type ValidatedDocumentUpload = {
  originalFilename: string;
  mimeType: ProjectDocumentMimeType;
  fileSize: number;
  bytes: Uint8Array;
};

function normalizeExtractedText(text: string): string {
  return text
    .replaceAll("\u0000", "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export async function validateDocumentUpload(file: File): Promise<ValidatedDocumentUpload> {
  const originalFilename = file.name.trim();
  if (
    originalFilename.length === 0 ||
    originalFilename.length > 255 ||
    /[\\/]/.test(originalFilename) ||
    [...originalFilename].some((character) => character.charCodeAt(0) < 32)
  ) {
    throw new DocumentProcessingError("The document filename is invalid.");
  }

  const mimeType = projectDocumentMimeTypeSchema.safeParse(file.type);
  if (!mimeType.success) {
    throw new DocumentProcessingError("Only PDF and plain-text documents are supported.");
  }
  if (file.size <= 0 || file.size > MAX_DOCUMENT_FILE_BYTES) {
    throw new DocumentProcessingError("Documents must be no larger than 5 MB.");
  }

  return {
    originalFilename,
    mimeType: mimeType.data,
    fileSize: file.size,
    bytes: new Uint8Array(await file.arrayBuffer()),
  };
}

export async function extractDocumentText(upload: ValidatedDocumentUpload): Promise<string> {
  let extracted: string;

  if (upload.mimeType === "text/plain") {
    try {
      extracted = new TextDecoder("utf-8", { fatal: true }).decode(upload.bytes);
    } catch {
      throw new DocumentProcessingError("The text document must use UTF-8 encoding.");
    }
  } else {
    const signature = new TextDecoder("ascii").decode(upload.bytes.subarray(0, 5));
    if (signature !== PDF_SIGNATURE) {
      throw new DocumentProcessingError("The uploaded file is not a valid PDF.");
    }

    const parser = new PDFParse({ data: upload.bytes });
    try {
      extracted = (await parser.getText()).text;
    } catch {
      throw new DocumentProcessingError("Text could not be extracted from this PDF.");
    } finally {
      await parser.destroy();
    }
  }

  const normalized = normalizeExtractedText(extracted);
  if (!normalized) {
    throw new DocumentProcessingError("No readable text was found in this document.");
  }
  if (normalized.length > MAX_EXTRACTED_TEXT_CHARACTERS) {
    throw new DocumentProcessingError("The extracted document text is too large.");
  }
  return normalized;
}
