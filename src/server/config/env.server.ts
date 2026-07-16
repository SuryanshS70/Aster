import { z } from "zod";

const logLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().trim().min(1).default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    LOG_LEVEL: z.enum(logLevels).default("info"),
    REQUEST_BODY_LIMIT_BYTES: z.coerce
      .number()
      .int()
      .min(1_024)
      .max(10 * 1_024 * 1_024)
      .default(1_048_576),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
    DATABASE_URL: z.string().trim().min(1),
    REDIS_URL: z.string().trim().min(1),
    REDIS_KEY_PREFIX: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9:_-]+$/)
      .default("aster"),
    SESSION_SECRET: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),
  })
  .superRefine((env, context) => {
    validateUrlProtocol(env.DATABASE_URL, ["postgres:", "postgresql:"], "DATABASE_URL", context);
    validateUrlProtocol(env.REDIS_URL, ["redis:", "rediss:"], "REDIS_URL", context);
  });

function validateUrlProtocol(
  value: string,
  protocols: string[],
  path: string,
  context: z.RefinementCtx,
): void {
  try {
    const url = new URL(value);
    if (!protocols.includes(url.protocol)) throw new Error("Unsupported protocol");
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: `${path} must be a valid ${protocols.join(" or ")} URL`,
    });
  }
}

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv {
  const result = serverEnvSchema.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))].filter(
      Boolean,
    );
    throw new Error(`Invalid server environment: ${fields.join(", ")}`);
  }
  return result.data;
}

export function getServerEnv(): ServerEnv {
  cachedEnv ??= parseServerEnv(process.env);
  return cachedEnv;
}

export function resetServerEnvForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Server environment cache can only be reset during tests");
  }
  cachedEnv = undefined;
}
