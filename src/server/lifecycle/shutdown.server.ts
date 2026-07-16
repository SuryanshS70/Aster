import { getServerEnv } from "../config/env.server";
import { closeDatabaseConnection } from "../db/client.server";
import { getLogger, toSafeError } from "../observability/logger.server";
import { closeRedisConnection } from "../redis/client.server";

let registered = false;

export function registerGracefulShutdown(): void {
  if (registered || typeof process === "undefined") return;
  registered = true;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }
}

async function shutdown(signal: "SIGINT" | "SIGTERM"): Promise<void> {
  const logger = getLogger();
  const timeoutMs = getServerEnv().SHUTDOWN_TIMEOUT_MS;
  logger.info({ signal }, "graceful shutdown started");
  try {
    await Promise.race([
      Promise.allSettled([closeDatabaseConnection(), closeRedisConnection()]),
      new Promise<never>((_, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Graceful shutdown timed out")),
          timeoutMs,
        );
        timeout.unref();
      }),
    ]);
  } catch (error) {
    logger.error({ error: toSafeError(error) }, "graceful shutdown failed");
    process.exitCode = 1;
    return;
  }
  logger.info("graceful shutdown completed");
  process.exitCode = 0;
}
