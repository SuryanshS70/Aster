import type { BetterAuthRateLimitStorage } from "better-auth";
import type { RedisClientType } from "redis";

import { getServerEnv } from "../config/env.server";
import { ensureRedisConnection } from "../redis/client.server";

type RedisProvider = () => Promise<Pick<RedisClientType, "get" | "set" | "del" | "eval">>;

const consumeScript = `
local current = redis.call("GET", KEYS[1])
if not current then
  redis.call("SET", KEYS[1], 1, "EX", ARGV[1])
  return {1, ARGV[1]}
end
local ttl = redis.call("TTL", KEYS[1])
if tonumber(current) >= tonumber(ARGV[2]) then
  return {0, ttl}
end
redis.call("INCR", KEYS[1])
return {1, ttl}
`;

export function createAuthRateLimitStorage(
  getRedis: RedisProvider = ensureRedisConnection,
  keyPrefix = `${getServerEnv().REDIS_KEY_PREFIX}:auth-rate:`,
  ttlSeconds = 60 * 60,
): BetterAuthRateLimitStorage {
  return {
    async get(key) {
      const value = await (await getRedis()).get(`${keyPrefix}${key}`);
      if (!value) return null;
      try {
        const parsed = JSON.parse(value) as {
          key?: unknown;
          count?: unknown;
          lastRequest?: unknown;
        };
        if (
          typeof parsed.key !== "string" ||
          typeof parsed.count !== "number" ||
          typeof parsed.lastRequest !== "number"
        ) {
          return null;
        }
        return {
          key: parsed.key,
          count: parsed.count,
          lastRequest: parsed.lastRequest,
        };
      } catch {
        return null;
      }
    },
    async set(key, value) {
      const client = await getRedis();
      const serialized = JSON.stringify(value);
      await client.set(`${keyPrefix}${key}`, serialized, { EX: ttlSeconds });
    },
    async consume(key, rule) {
      const client = await getRedis();
      const result = (await client.eval(consumeScript, {
        keys: [`${keyPrefix}${key}`],
        arguments: [String(rule.window), String(rule.max)],
      })) as [number, number];
      const allowed = Number(result[0]) === 1;
      const ttl = Number(result[1]);
      return { allowed, retryAfter: allowed ? null : Math.max(1, ttl > 0 ? ttl : rule.window) };
    },
  };
}
