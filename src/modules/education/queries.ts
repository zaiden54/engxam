import "server-only";
import { getPool } from "@/lib/db/pool";
import { currentActor } from "../identity/session";
export type UserView={id:string;email:string;fullName:string;role:"admin"|"teacher"|"student";active:boolean;version:number};
export type PeriodView={id:string;name:string;archived:boolean;version:number};
export type GroupView={id:string;name:string;periodId:string;periodName:string;version:number};
export type EnrollmentView={id:string;studentName:string;teacherName:string;studentId:string;teacherId:string;groupId:string;groupName:string;periodName:string;specialty:string;language:string;dissertationTopic:string;supervisorName:string;version:number};
export type Workspace={actor:UserView;users:UserView[];periods:PeriodView[];groups:GroupView[];enrollments:EnrollmentView[];page:number;hasNext:boolean};
export async function workspace(page=1):Promise<Workspace>{
  page=Number.isSafeInteger(page)&&page>0&&page<=10000?page:1;
  const actor=await currentActor();const pool=getPool();
  const enrollments=await pool.query<EnrollmentView>(`SELECT e.id,e.student_id as "studentId",e.teacher_id as "teacherId",e.group_id as "groupId",s.full_name as "studentName",t.full_name as "teacherName",g.name as "groupName",p.name as "periodName",e.specialty,e.language,e.dissertation_topic as "dissertationTopic",e.supervisor_name as "supervisorName",e.version FROM enrollment e JOIN app_user s ON s.id=e.student_id JOIN app_user t ON t.id=e.teacher_id JOIN academic_group g ON g.id=e.group_id JOIN academic_period p ON p.id=g.period_id JOIN app_user viewer ON viewer.id=$1 AND viewer.active WHERE viewer.role='admin' OR (viewer.role='student' AND e.student_id=viewer.id) OR (viewer.role='teacher' AND e.teacher_id=viewer.id) ORDER BY p.starts_on DESC,s.full_name,e.id LIMIT 26 OFFSET $2`,[actor.id,(page-1)*25]);
  const list={enrollments:enrollments.rows.slice(0,25),page,hasNext:enrollments.rows.length>25};
  if(actor.role!=="admin")return {actor,users:[],periods:[],groups:[],...list};
  const [users,periods,groups]=await Promise.all([
    pool.query<UserView>('SELECT id,email,full_name as "fullName",role,active,version FROM app_user ORDER BY full_name,id LIMIT 100'),
    pool.query<PeriodView>('SELECT id,name,archived,version FROM academic_period ORDER BY starts_on DESC LIMIT 100'),
    pool.query<GroupView>('SELECT g.id,g.name,g.period_id as "periodId",p.name as "periodName",g.version FROM academic_group g JOIN academic_period p ON p.id=g.period_id ORDER BY g.name LIMIT 100'),
  ]);
  return {actor,users:users.rows,periods:periods.rows,groups:groups.rows,...list};
}
