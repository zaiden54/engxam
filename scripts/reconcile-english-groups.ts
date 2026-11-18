import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { z } from "zod";

const uuid = z.uuid().transform(value => value.toLowerCase());
const mapping = z.strictObject({
  currentByStudent: z.record(uuid, uuid),
  teacherByGroup: z.record(uuid, uuid),
});

const [command, envFile, mappingFile] = process.argv.slice(2);
if (!envFile || !((command === "report" && !mappingFile) || (command === "migrate" && mappingFile))) {
  throw new Error("Usage: tsx scripts/reconcile-english-groups.ts report <env-file> | migrate <env-file> <mapping.json>");
}
const { DATABASE_URL_UNPOOLED: connectionString } = parseEnv(readFileSync(envFile, "utf8"));
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is required in the selected environment");

const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  if (command === "report") {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const students = await client.query(`
      SELECT e.student_id AS "studentId", s.full_name AS student,
        jsonb_agg(jsonb_build_object('id', e.id, 'group', g.name, 'period', p.name,
          'archived', p.archived) ORDER BY p.starts_on DESC, e.id) AS enrollments
      FROM enrollment e
      JOIN app_user s ON s.id = e.student_id
      JOIN academic_group g ON g.id = e.group_id
      JOIN academic_period p ON p.id = e.period_id
      GROUP BY e.student_id, s.full_name
      HAVING count(*) > 1
      ORDER BY e.student_id
    `);
    const groups = await client.query(`
      SELECT g.id AS "groupId", g.name AS "group", p.name AS period, p.archived,
        jsonb_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.full_name, 'active', t.active)) AS teachers
      FROM academic_group g
      JOIN academic_period p ON p.id = g.period_id
      JOIN enrollment e ON e.group_id = g.id
      JOIN app_user t ON t.id = e.teacher_id
      GROUP BY g.id, p.id
      HAVING count(DISTINCT t.id) > 1 OR NOT bool_and(t.active)
      ORDER BY g.id
    `);
    await client.query("COMMIT");
    console.log(JSON.stringify({ students: students.rows, groups: groups.rows, mapping: {
      currentByStudent: {}, teacherByGroup: {},
    } }, null, 2));
  } else {
    const confirmed = mapping.parse(JSON.parse(readFileSync(mappingFile, "utf8")));
    await client.query("SELECT set_config('engxam.english_group_mapping', $1, false)", [JSON.stringify(confirmed)]);
    await migrate(drizzle(client), { migrationsFolder: "./migrations" });
  }
} finally {
  await client.end();
}
