import { randomUUID, createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { AppError } from "../../lib/errors";
import { envelopeSchema, type Command } from "./schemas";
import { requireRole, type Actor } from "../identity/policy";

export type IdentityAdmin = {
  provision(email:string, name:string, admin:boolean): Promise<string>;
  update(authId:string, admin:boolean, active:boolean): Promise<void>;
};
async function actorFor(client:PoolClient, authId:string):Promise<Actor> {
  const { rows } = await client.query('SELECT id,auth_id as "authId",email,full_name as "fullName",role,active,version FROM app_user WHERE auth_id=$1 FOR UPDATE',[authId]);
  if (!rows[0]?.active) throw new AppError("FORBIDDEN","Доступ отключён или не назначен.");
  return rows[0];
}
async function changed(client:PoolClient, query:string, params:unknown[]) {
  const result = await client.query(query,params);
  if (!result.rowCount) throw new AppError("CONFLICT","Запись изменилась. Обновите страницу.");
  return result.rows[0]?.id as string;
}
async function execute(client:PoolClient, actor:Actor, command:Command, identities:IdentityAdmin) {
  if (command.operation !== "updateProfile") requireRole(actor,"admin");
  switch(command.operation) {
    case "createUser": {
      const exists = await client.query("SELECT id FROM app_user WHERE lower(email)=lower($1)",[command.email]);
      if (exists.rowCount) throw new AppError("CONFLICT","Этот пользователь уже добавлен.");
      const authId = await identities.provision(command.email,command.fullName,command.role==="admin");
      const id = await changed(client,'INSERT INTO app_user(auth_id,email,full_name,role) VALUES($1,$2,$3,$4) RETURNING id',[authId,command.email,command.fullName,command.role]);
      if(command.role!=="admin") await client.query(`INSERT INTO ${command.role==="student"?"student_profile":"teacher_profile"}(user_id) VALUES($1)`,[id]);
      return id;
    }
    case "updateUser": {
      const {rows} = await client.query("SELECT * FROM app_user WHERE id=$1 FOR UPDATE",[command.id]);
      const old = rows[0]; if(!old) throw new AppError("NOT_FOUND","Пользователь не найден.");
      if(old.version!==command.version) throw new AppError("CONFLICT","Запись изменилась.");
      if(actor.id===command.id && (!command.active || command.role!=="admin")) throw new AppError("CONFLICT","Нельзя отключить себя или снять собственные права администратора.");
      if(old.role!==command.role) {
        const linked = await client.query("SELECT 1 FROM enrollment WHERE student_id=$1 OR teacher_id=$1 LIMIT 1",[command.id]);
        if(linked.rowCount) throw new AppError("CONFLICT","Сначала измените учебные назначения. Роль участника с историей обучения менять нельзя.");
        await client.query("DELETE FROM student_profile WHERE user_id=$1",[command.id]); await client.query("DELETE FROM teacher_profile WHERE user_id=$1",[command.id]);
        if(command.role!=="admin") await client.query(`INSERT INTO ${command.role==="student"?"student_profile":"teacher_profile"}(user_id) VALUES($1)`,[command.id]);
      }
      // The app flag is authoritative on every request. Revocation also invalidates Auth sessions.
      await identities.update(old.auth_id,command.role==="admin",command.active);
      return changed(client,"UPDATE app_user SET full_name=$1,role=$2,active=$3,version=version+1,updated_at=now() WHERE id=$4 AND version=$5 RETURNING id",[command.fullName,command.role,command.active,command.id,command.version]);
    }
    case "createPeriod": return changed(client,"INSERT INTO academic_period(name,starts_on,ends_on,preparation_deadline) VALUES($1,$2,$3,$4) RETURNING id",[command.name,command.startsOn,command.endsOn,command.preparationDeadline]);
    case "updatePeriod": return changed(client,"UPDATE academic_period SET name=$1,archived=$2,version=version+1,updated_at=now() WHERE id=$3 AND version=$4 RETURNING id",[command.name,command.archived,command.id,command.version]);
    case "createGroup": {
      const period = await client.query("SELECT 1 FROM academic_period WHERE id=$1 AND NOT archived",[command.periodId]);
      if(!period.rowCount) throw new AppError("CONFLICT","Поток недоступен.");
      return changed(client,"INSERT INTO academic_group(period_id,name) VALUES($1,$2) RETURNING id",[command.periodId,command.name]);
    }
    case "updateGroup": return changed(client,"UPDATE academic_group SET name=$1,version=version+1,updated_at=now() WHERE id=$2 AND version=$3 RETURNING id",[command.name,command.id,command.version]);
    case "enroll": {
      const valid = await client.query("SELECT g.period_id FROM academic_group g JOIN academic_period p ON p.id=g.period_id WHERE g.id=$1 AND NOT p.archived",[command.groupId]);
      const people = await client.query("SELECT id,role FROM app_user WHERE id=ANY($1::uuid[]) AND active",[[command.studentId,command.teacherId]]);
      if(!valid.rowCount || !people.rows.some(p=>p.id===command.studentId&&p.role==="student") || !people.rows.some(p=>p.id===command.teacherId&&p.role==="teacher")) throw new AppError("CONFLICT","Проверьте группу и активных участников.");
      return changed(client,"INSERT INTO enrollment(student_id,teacher_id,group_id,period_id,specialty,language) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[command.studentId,command.teacherId,command.groupId,valid.rows[0].period_id,command.specialty,command.language]);
    }
    case "assign": {
      const valid = await client.query("SELECT 1 FROM app_user WHERE id=$1 AND role='teacher' AND active",[command.teacherId]);
      if(!valid.rowCount) throw new AppError("CONFLICT","Преподаватель недоступен.");
      return changed(client,"UPDATE enrollment e SET teacher_id=$1,group_id=$2,version=e.version+1,updated_at=now() FROM academic_group g WHERE e.id=$3 AND e.version=$4 AND g.id=$2 AND g.period_id=e.period_id RETURNING e.id",[command.teacherId,command.groupId,command.id,command.version]);
    }
    case "updateProfile": {
      if(actor.role!=="student") throw new AppError("FORBIDDEN","Редактирование доступно студенту.");
      return changed(client,"UPDATE enrollment SET dissertation_topic=$1,supervisor_name=$2,version=version+1,updated_at=now() WHERE id=$3 AND student_id=$4 AND version=$5 RETURNING id",[command.dissertationTopic,command.supervisorName,command.id,actor.id,command.version]);
    }
  }
}
export async function runCommand(pool:Pool,authId:string,input:unknown,identities:IdentityAdmin) {
  const parsed=envelopeSchema.safeParse(input); if(!parsed.success) throw new AppError("VALIDATION_ERROR",parsed.error.issues[0]?.message??"Проверьте поля.");
  const {key,command}=parsed.data; const hash=createHash("sha256").update(JSON.stringify(command)).digest("hex");
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialise low-volume education administration and role changes in a consistent order.
    await client.query("SELECT pg_advisory_xact_lock(74822102)");
    const actor=await actorFor(client,authId);
    const prior=await client.query("SELECT payload_hash,result FROM idempotency_request WHERE actor_id=$1 AND operation=$2 AND key=$3",[actor.id,command.operation,key]);
    if(prior.rowCount){ if(prior.rows[0].payload_hash!==hash) throw new AppError("CONFLICT","Ключ запроса использован для других данных."); await client.query("COMMIT");return prior.rows[0].result as {id:string}; }
    const id=await execute(client,actor,command,identities);
    const result={id};
    await client.query("INSERT INTO idempotency_request(actor_id,operation,key,payload_hash,result) VALUES($1,$2,$3,$4,$5)",[actor.id,command.operation,key,hash,JSON.stringify(result)]);
    await client.query("INSERT INTO audit_event(actor_id,action,entity_id,details,request_id) VALUES($1,$2,$3,$4,$5)",[actor.id,command.operation,id,JSON.stringify(command),randomUUID()]);
    await client.query("COMMIT");return result;
  } catch(error) {
    await client.query("ROLLBACK");
    if(["23505","23503","23514"].includes((error as {code:string}).code)) throw new AppError("CONFLICT","Данные уже существуют или связаны с другими записями.");
    throw error;
  } finally {client.release();}
}
