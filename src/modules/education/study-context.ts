import "server-only";
import { getPool } from "@/lib/db/pool";
import { z } from "zod";
import { resolveStudySelection, type StudyChoice } from "./study-selection";

export async function studyContext(actorId: string, requested: string | string[] | undefined) {
  const parsed = z.uuid().safeParse(requested);
  if (requested !== undefined && !parsed.success) return { choices: [], unavailable: true, selected: undefined };
  const { rows: choices } = await getPool().query<StudyChoice & { groupId: string }>(`
    SELECT e.id, student.full_name AS student, g.name AS "group", g.id AS "groupId", p.name AS period
    FROM enrollment e
    JOIN app_user viewer ON viewer.id = $1 AND viewer.active
    JOIN app_user student ON student.id = e.student_id
    JOIN academic_group g ON g.id = e.group_id
    JOIN academic_period p ON p.id = g.period_id
    WHERE e.current AND ($2::uuid IS NULL OR e.id = $2)
      AND ((viewer.role = 'student' AND e.student_id = viewer.id)
        OR (viewer.role = 'teacher' AND g.teacher_id = viewer.id AND $2 IS NOT NULL))
    ORDER BY p.starts_on DESC, student.full_name, g.name, e.id
  `, [actorId, parsed.data ?? null]);
  return { choices, ...resolveStudySelection(choices, requested) };
}

export async function teacherGroups(actorId: string, requested: string | string[] | undefined) {
  const id = z.uuid().safeParse(requested).data?.toLowerCase();
  const { rows: groups } = await getPool().query<{
    id: string; name: string; period: string; students: { id: string; name: string }[];
  }>(`
    SELECT g.id, g.name, p.name AS period, ARRAY(
      SELECT jsonb_build_object('id', e.id, 'name', s.full_name)
      FROM enrollment e JOIN app_user s ON s.id = e.student_id
      WHERE g.id = $2 AND e.group_id = g.id AND e.current
      ORDER BY s.full_name, e.id
    ) AS students
    FROM academic_group g
    JOIN academic_period p ON p.id = g.period_id
    JOIN app_user viewer ON viewer.id = g.teacher_id AND viewer.role = 'teacher' AND viewer.active
    WHERE viewer.id = $1
    ORDER BY p.starts_on DESC, g.name, g.id
  `, [actorId, id ?? null]);
  const selected = groups.find(group => group.id === id);
  return { groups, selected, unavailable: requested !== undefined && !selected };
}
