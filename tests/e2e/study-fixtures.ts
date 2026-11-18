import { test as base } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { Client } from "pg";

export const test = base.extend<{ cleanStudentMembership: string }>({
  cleanStudentMembership: async ({}, runTest, testInfo) => {
    testInfo.skip(process.env.E2E_STAGE02 !== "1", "Requires isolated stage02 fixtures");
    const env = parseEnv(readFileSync(".env.stage02", "utf8"));
    if (env.NEON_BRANCH !== "engxam-stage02" || !env.DATABASE_URL_UNPOOLED) {
      throw new Error("Isolated stage02 fixtures required");
    }
    const people = JSON.parse(readFileSync(".env.stage02-fixtures.json", "utf8")) as { role: string; id: string }[];
    const student = people.find(person => person.role === "student");
    if (!student) throw new Error("Missing student fixture");
    const client = new Client({ connectionString: env.DATABASE_URL_UNPOOLED });
    try {
      await client.connect();
      await client.query("SELECT pg_advisory_lock(hashtext($1))", [student.id]);
      const { rows: [prior] } = await client.query(
        "UPDATE enrollment SET current=false WHERE student_id=$1 AND current RETURNING id",
        [student.id],
      );
      try {
      await runTest(student.id);
      } finally {
        await client.query("BEGIN");
        try {
          await client.query("UPDATE enrollment SET current=false WHERE student_id=$1 AND current", [student.id]);
          if (prior) await client.query("UPDATE enrollment SET current=true WHERE id=$1", [prior.id]);
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
    } finally {
      await client.end();
    }
  },
});
