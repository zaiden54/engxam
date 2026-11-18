import "server-only";
import { getPool } from "@/lib/db/pool";
import type { Actor } from "../identity/policy";
export type UserView={id:string;email:string;fullName:string;role:"admin"|"teacher"|"student";active:boolean;version:number};
export type PeriodView={id:string;name:string;archived:boolean;version:number};
export type GroupView={id:string;name:string;periodId:string;periodName:string;version:number;teacherId:string|null;teacherName:string|null;available:boolean};
export type EnrollmentView={id:string;studentName:string;teacherName:string;studentId:string;teacherId:string;groupId:string;groupName:string;periodName:string;specialty:string;language:string;dissertationTopic:string;supervisorName:string;version:number};
export type Workspace={actor:UserView;users:UserView[];periods:PeriodView[];groups:GroupView[];enrollments:EnrollmentView[];page:number;hasNext:boolean};
export async function workspace(actor:Actor,page=1):Promise<Workspace>{
  page=Number.isSafeInteger(page)&&page>0&&page<=10000?page:1;
  const pool=getPool();
  if (actor.role === "student") page = 1;
  const enrollments=await pool.query<EnrollmentView>(`
    SELECT e.id, e.student_id AS "studentId", g.teacher_id AS "teacherId", e.group_id AS "groupId",
      s.full_name AS "studentName", t.full_name AS "teacherName", g.name AS "groupName", p.name AS "periodName",
      e.specialty, e.language, e.dissertation_topic AS "dissertationTopic", e.supervisor_name AS "supervisorName", e.version
    FROM enrollment e
    JOIN app_user s ON s.id=e.student_id
    JOIN academic_group g ON g.id=e.group_id
    JOIN app_user t ON t.id=g.teacher_id
    JOIN academic_period p ON p.id=g.period_id
    JOIN app_user viewer ON viewer.id=$1 AND viewer.active
    WHERE e.current AND (viewer.role='admin'
      OR (viewer.role='student' AND e.student_id=viewer.id)
      OR (viewer.role='teacher' AND g.teacher_id=viewer.id))
    ORDER BY p.starts_on DESC,s.full_name,e.id LIMIT 26 OFFSET $2
  `,[actor.id,(page-1)*25]);
  const list={enrollments:enrollments.rows.slice(0,25),page,hasNext:enrollments.rows.length>25};
  if(actor.role!=="admin")return {actor,users:[],periods:[],groups:[],...list};
  const [users,periods,groups]=await Promise.all([
    pool.query<UserView>('SELECT id,email,full_name as "fullName",role,active,version FROM app_user ORDER BY full_name,id LIMIT 100'),
    pool.query<PeriodView>('SELECT id,name,archived,version FROM academic_period ORDER BY starts_on DESC LIMIT 100'),
    pool.query<GroupView>(`
      SELECT g.id,g.name,g.period_id AS "periodId",p.name AS "periodName",g.version,
        g.teacher_id AS "teacherId",t.full_name AS "teacherName",
        (NOT p.archived AND coalesce(t.active,false)) AS available
      FROM academic_group g JOIN academic_period p ON p.id=g.period_id
      LEFT JOIN app_user t ON t.id=g.teacher_id ORDER BY g.name,g.id LIMIT 100
    `),
  ]);
  return {actor,users:users.rows,periods:periods.rows,groups:groups.rows,...list};
}
