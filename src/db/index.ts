import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function databaseUrl() {
  if (process.env.VITEST) {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl) {
      throw new Error("TEST_DATABASE_URL is required for tests");
    }
    const name = new URL(testUrl).pathname.replace(/^\//, "");
    if (name !== "glossy_test") {
      throw new Error("Refusing to run tests against a non-test database");
    }
    return testUrl;
  }
  return process.env.DATABASE_URL;
}

const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: databaseUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
