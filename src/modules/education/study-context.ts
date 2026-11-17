import "server-only";
import { getPool } from "@/lib/db/pool";
import { resolveStudySelection, type StudyChoice } from "./study-selection";

export async function studyContext(actorId: string, requested: string | string[] | undefined) {
  const { rows: choices } = await getPool().query<StudyChoice>(`
    SELECT e.id, student.full_name AS student, g.name AS "group", p.name AS period
    FROM enrollment e
    JOIN app_user viewer ON viewer.id = $1 AND viewer.active
    JOIN app_user student ON student.id = e.student_id
    JOIN academic_group g ON g.id = e.group_id
    JOIN academic_period p ON p.id = g.period_id
    WHERE (viewer.role = 'student' AND e.student_id = viewer.id)
       OR (viewer.role = 'teacher' AND e.teacher_id = viewer.id)
    ORDER BY p.starts_on DESC, student.full_name, g.name, e.id
  `, [actorId]);
  return { choices, ...resolveStudySelection(choices, requested) };
}
