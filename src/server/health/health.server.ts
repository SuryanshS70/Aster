import { checkDatabaseConnection } from "../db/client.server";
import { withApiErrorBoundary } from "../http/api-handler.server";
import { jsonResponse } from "../http/responses.server";
import { getLogger, toSafeError } from "../observability/logger.server";
import { checkRedisConnection } from "../redis/client.server";

type HealthDependencies = {
  checkDatabase: () => Promise<void>;
  checkRedis: () => Promise<void>;
};

const defaultDependencies: HealthDependencies = {
  checkDatabase: checkDatabaseConnection,
  checkRedis: checkRedisConnection,
};

export function handleLiveHealthRequest(requestId: string): Promise<Response> {
  return withApiErrorBoundary(requestId, () => jsonResponse({ status: "ok" }));
}

export function createReadyHealthHandler(dependencies: HealthDependencies = defaultDependencies) {
  return (requestId: string): Promise<Response> =>
    withApiErrorBoundary(requestId, async () => {
      const [database, redis] = await Promise.allSettled([
        dependencies.checkDatabase(),
        dependencies.checkRedis(),
      ]);
      const checks = {
        database: database.status === "fulfilled" ? "ok" : "unavailable",
        redis: redis.status === "fulfilled" ? "ok" : "unavailable",
      };

      if (database.status === "rejected" || redis.status === "rejected") {
        const logger = getLogger().child({ requestId });
        if (database.status === "rejected") {
          logger.warn(
            { dependency: "database", error: toSafeError(database.reason) },
            "readiness check failed",
          );
        }
        if (redis.status === "rejected") {
          logger.warn(
            { dependency: "redis", error: toSafeError(redis.reason) },
            "readiness check failed",
          );
        }
        return jsonResponse({ status: "not_ready", checks }, { status: 503 });
      }
      return jsonResponse({ status: "ready", checks });
    });
}

export const handleReadyHealthRequest = createReadyHealthHandler();
