import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { databaseEnvironment } from "../env";
let pool: Pool | undefined;
export function getPool() {
  if (!pool) {
    const url = new URL(databaseEnvironment().DATABASE_URL);
    url.searchParams.set("sslmode", "verify-full");
    pool = new Pool({ connectionString: url.toString(), max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 5000 });
    if (process.env.VERCEL) attachDatabasePool(pool);
  }
  return pool;
}
