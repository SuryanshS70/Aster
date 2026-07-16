import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env.server";

const validEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:password@localhost:5432/aster",
  REDIS_URL: "redis://localhost:6379",
};

describe("server environment validation", () => {
  it("parses valid values and applies safe defaults", () => {
    const env = parseServerEnv(validEnv);
    expect(env.PORT).toBe(3000);
    expect(env.REQUEST_BODY_LIMIT_BYTES).toBe(1_048_576);
    expect(env.REDIS_KEY_PREFIX).toBe("aster");
  });

  it("rejects missing dependency URLs without echoing secrets", () => {
    expect(() => parseServerEnv({ NODE_ENV: "test" })).toThrow(
      "Invalid server environment: DATABASE_URL, REDIS_URL",
    );
  });

  it("rejects unsupported URL protocols", () => {
    expect(() =>
      parseServerEnv({ ...validEnv, DATABASE_URL: "https://db.example.test/aster" }),
    ).toThrow("Invalid server environment: DATABASE_URL");
  });
});
