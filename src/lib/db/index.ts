import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "./pool";

let database: ReturnType<typeof drizzle> | undefined;
export function getDatabase() {
  if (!database) {
    database = drizzle(getPool());
  }
  return database;
}
