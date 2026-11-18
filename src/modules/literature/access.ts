import type {PoolClient} from "pg";
import {AppError} from "../../lib/errors";
import type {Actor} from "../identity/policy";
export async function authorizeEnrollment(client:PoolClient,actorId:string,enrollmentId:string,write=false):Promise<Actor>{
  // Shared locks prevent role/deactivation/reassignment changes during a file mutation.
  const result=await client.query(`SELECT id,auth_id as "authId",email,full_name as "fullName",role,active,version FROM app_user WHERE id=$1 AND active FOR SHARE`,[actorId]);
  const actor=result.rows[0];if(!actor)throw new AppError("NOT_FOUND","Материал или обучение недоступны.");
  const enrollment=await client.query(`
    SELECT group_id FROM enrollment WHERE id=$1 AND current
      AND (($2='student' AND student_id=$3) OR ($2='teacher' AND NOT $4))
    FOR ${write?"UPDATE":"SHARE"}`,[enrollmentId,actor.role,actorId,write]);
  if(!enrollment.rowCount)throw new AppError("NOT_FOUND","Материал или обучение недоступны.");
  if(actor.role==="teacher"){
    const group=await client.query(
      "SELECT 1 FROM academic_group WHERE id=$1 AND teacher_id=$2 FOR SHARE",
      [enrollment.rows[0].group_id,actorId],
    );
    if(!group.rowCount)throw new AppError("NOT_FOUND","Материал или обучение недоступны.");
  }
  return actor;
}
