import "dotenv/config";

import { defineConfig } from "drizzle-kit";

import { parseServerEnv } from "./src/server/config/env.server";

const env = parseServerEnv(process.env);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: env.DATABASE_URL },
  strict: true,
  verbose: true,
});
