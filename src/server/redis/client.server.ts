import { createClient, type RedisClientType } from "redis";

import { getServerEnv } from "../config/env.server";
import { getLogger, toSafeError } from "../observability/logger.server";

let redisClient: RedisClientType | undefined;
let connectionPromise: Promise<RedisClientType> | undefined;

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    const env = getServerEnv();
    redisClient = createClient({
      url: env.REDIS_URL,
      disableOfflineQueue: true,
      socket: {
        connectTimeout: 5_000,
        reconnectStrategy: (retries) =>
          retries > 3
            ? new Error("Redis reconnect limit reached")
            : Math.min(100 * 2 ** retries, 3_000),
      },
    });
    redisClient.on("error", (error) => {
      getLogger().warn({ error: toSafeError(error) }, "Redis client error");
    });
  }
  return redisClient;
}

export async function ensureRedisConnection(): Promise<RedisClientType> {
  const client = getRedisClient();
  if (client.isReady) return client;
  connectionPromise ??= client.connect().finally(() => {
    connectionPromise = undefined;
  });
  return connectionPromise;
}

export async function checkRedisConnection(): Promise<void> {
  const client = await ensureRedisConnection();
  await client.ping();
}

export async function closeRedisConnection(): Promise<void> {
  const client = redisClient;
  redisClient = undefined;
  connectionPromise = undefined;
  if (!client) return;
  if (client.isOpen) await client.quit();
  else client.destroy();
}
