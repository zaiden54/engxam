import { request, test as base } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { Client } from "pg";

export const test = base.extend<{ cleanStudentMembership: string }>({
  cleanStudentMembership: async ({ baseURL }, runTest, testInfo) => {
    testInfo.skip(process.env.E2E_STAGE02 !== "1", "Requires isolated stage02 fixtures");
    const env = parseEnv(readFileSync(".env.stage02", "utf8"));
    if (env.NEON_BRANCH !== "engxam-stage02" || !env.DATABASE_URL_UNPOOLED) {
      throw new Error("Isolated stage02 fixtures required");
    }
    const people = JSON.parse(readFileSync(".env.stage02-fixtures.json", "utf8")) as {
      role: string; id: string; email: string; password: string;
    }[];
    const student = people.find(person => person.role === "student");
    const admin = people.find(person => person.role === "admin");
    if (!student || !admin || !baseURL) throw new Error("Missing Stage02 fixtures or test origin");
    const client = new Client({ connectionString: env.DATABASE_URL_UNPOOLED });

    const restoreStudentAccess = async () => {
      const { rows: [user] } = await client.query<{ active: boolean; version: number; fullName: string }>(
        `SELECT active, version, full_name AS "fullName" FROM app_user WHERE id=$1 AND role='student'`,
        [student.id],
      );
      if (!user) throw new Error("Missing Stage02 student account");
      if (user.active) return;

      const context = await request.newContext({
        baseURL, ignoreHTTPSErrors: true, extraHTTPHeaders: { Origin: new URL(baseURL).origin }, timeout: 20000,
      });
      try {
        const login = await context.post("/api/auth/sign-in/email", { data: { email: admin.email, password: admin.password } });
        if (!login.ok()) throw new Error(`Stage02 fixture admin sign-in failed (${login.status()})`);
        const restore = await context.post("/api/education", {
          data: {
            key: randomUUID(),
            command: {
              operation: "updateUser", id: student.id, role: "student",
              fullName: user.fullName, version: user.version, active: true,
            },
          },
        });
        if (!restore.ok()) throw new Error(`Stage02 student reactivation failed (${restore.status()})`);
      } finally {
        await context.dispose();
      }
    };

    try {
      await client.connect();
      await client.query("SELECT pg_advisory_lock(hashtext($1))", [student.id]);
      await restoreStudentAccess();
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
        await restoreStudentAccess();
      }
    } finally {
      await client.end();
    }
  },
});
