import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { getServerEnv } from "../config/env.server";

let sqlClient: Sql | undefined;
let database: PostgresJsDatabase | undefined;

export function getDatabase(): PostgresJsDatabase {
  database ??= drizzle(getSqlClient());
  return database;
}

export function getSqlClient(): Sql {
  if (!sqlClient) {
    const env = getServerEnv();
    sqlClient = postgres(env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 5,
      prepare: false,
    });
  }
  return sqlClient;
}

export async function checkDatabaseConnection(): Promise<void> {
  await getSqlClient()`select 1`;
}

export async function closeDatabaseConnection(): Promise<void> {
  const client = sqlClient;
  sqlClient = undefined;
  database = undefined;
  if (client) await client.end({ timeout: 5 });
}
