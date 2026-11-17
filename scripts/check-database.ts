import nextEnv from "@next/env";
import assert from "node:assert/strict";
import { getPool } from "../src/lib/db/pool";
nextEnv.loadEnvConfig(process.cwd());
async function main() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const extension = await client.query("SELECT 1 FROM pg_available_extensions WHERE name = 'btree_gist'");
    assert.equal(extension.rowCount, 1);
    await client.query("CREATE EXTENSION IF NOT EXISTS btree_gist");
    await client.query("CREATE TEMP TABLE engxam_probe (book int, pages int4range, EXCLUDE USING gist (book WITH =, pages WITH &&)) ON COMMIT DROP");
    await client.query("INSERT INTO engxam_probe VALUES (1, '[1,11)')");
    await client.query("SAVEPOINT overlap_check");
    let code: string | undefined;
    try { await client.query("INSERT INTO engxam_probe VALUES (1, '[10,15)')"); } catch (error) { code = (error as { code: string }).code; }
    assert.equal(code, "23P01");
    await client.query("ROLLBACK TO SAVEPOINT overlap_check");
    await client.query("SELECT * FROM engxam_probe FOR UPDATE");
    await client.query("ROLLBACK");
    const result = await client.query("SELECT to_regclass('pg_temp.engxam_probe') as table_name");
    assert.equal(result.rows[0].table_name, null);
    console.log("PASS PostgreSQL: connect, transaction, row lock, btree_gist, overlapping-range rejection, rollback; no persistent probe data");
  } finally { await client.query("ROLLBACK").catch(() => {}); client.release(); await pool.end(); }
}
main().then(() => process.exit(0)).catch(() => { console.error("FAIL PostgreSQL probe (connection details redacted)"); process.exit(1); });
