const CHUNK_CHARACTERS = 1_400;
const CHUNK_OVERLAP_CHARACTERS = 180;
const MAX_CONTEXT_CHUNKS = 4;
const MAX_CONTEXT_CHARACTERS = 5_600;

const stopWords = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "can",
  "could",
  "for",
  "from",
  "have",
  "how",
  "into",
  "its",
  "please",
  "that",
  "the",
  "their",
  "these",
  "this",
  "was",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
]);

export type RetrievalDocument = {
  filename: string;
  text: string;
};

export function splitDocumentText(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_CHARACTERS, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf(" ", end);
      if (boundary > start + CHUNK_CHARACTERS * 0.65) end = boundary;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (end === normalized.length) break;
    start = Math.max(end - CHUNK_OVERLAP_CHARACTERS, start + 1);
  }
  return chunks;
}

function terms(value: string): string[] {
  return (value.toLowerCase().match(/[a-z0-9]{2,}/g) ?? []).filter((term) => !stopWords.has(term));
}

function scoreChunk(chunk: string, queryTerms: string[], query: string): number {
  const frequencies = new Map<string, number>();
  for (const term of terms(chunk)) {
    frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  }

  let score = 0;
  for (const term of new Set(queryTerms)) {
    const frequency = frequencies.get(term) ?? 0;
    if (frequency > 0) score += 3 + Math.min(frequency, 5);
  }

  const phrase = query.trim().toLowerCase();
  if (phrase.length >= 10 && chunk.toLowerCase().includes(phrase)) score += 8;
  return score;
}

export function retrieveRelevantContext(documents: RetrievalDocument[], query: string): string {
  const queryTerms = terms(query);
  const candidates = documents.flatMap((document, documentIndex) =>
    splitDocumentText(document.text).map((text, chunkIndex) => ({
      filename: document.filename,
      text,
      order: documentIndex * 10_000 + chunkIndex,
      score: scoreChunk(text, queryTerms, query),
    })),
  );
  if (candidates.length === 0) return "";

  candidates.sort((left, right) => right.score - left.score || left.order - right.order);
  const ranked =
    candidates[0]?.score === 0
      ? candidates.sort((left, right) => left.order - right.order)
      : candidates;

  const selected: typeof candidates = [];
  let characters = 0;
  for (const candidate of ranked) {
    if (selected.length >= MAX_CONTEXT_CHUNKS) break;
    const remaining = MAX_CONTEXT_CHARACTERS - characters;
    if (remaining <= 0) break;
    const text = candidate.text.slice(0, remaining);
    if (!text) continue;
    selected.push({ ...candidate, text });
    characters += text.length;
  }

  return selected.map((chunk) => "[Source: " + chunk.filename + "]\n" + chunk.text).join("\n\n");
}
