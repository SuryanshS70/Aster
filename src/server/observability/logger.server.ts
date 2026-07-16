import pino, { type Logger } from "pino";

import { getServerEnv } from "../config/env.server";

const redactedPaths = [
  "password",
  "token",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "DATABASE_URL",
  "REDIS_URL",
  "SESSION_SECRET",
  "GEMINI_API_KEY",
  "req.headers.authorization",
  "req.headers.cookie",
  "request.headers.authorization",
  "request.headers.cookie",
  "*.password",
  "*.token",
  "*.secret",
  "*.apiKey",
];

let logger: Logger | undefined;

export function getLogger(): Logger {
  if (!logger) {
    const env = getServerEnv();
    logger = pino({
      name: "aster",
      level: env.LOG_LEVEL,
      redact: { paths: redactedPaths, censor: "[REDACTED]" },
    });
  }
  return logger;
}

export function toSafeError(error: unknown): { name: string; code?: string } {
  if (!(error instanceof Error)) return { name: "UnknownError" };
  const candidate = error as Error & { code?: unknown };
  return typeof candidate.code === "string"
    ? { name: error.name, code: candidate.code }
    : { name: error.name };
}
