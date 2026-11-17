import nextEnv from "@next/env";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { runCommand,type IdentityAdmin } from "../src/modules/education/service";
nextEnv.loadEnvConfig(process.cwd());
if(!process.env.ENGXAM_ENV_FILE)throw Error("Explicit test environment required");
Object.assign(process.env,parseEnv(readFileSync(process.env.ENGXAM_ENV_FILE,"utf8")));
if(process.env.NEON_BRANCH!=="engxam-stage02")throw Error("Only engxam-stage02 is allowed");
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const identities:IdentityAdmin={async provision(){return randomUUID();},async update(){}};
const prefix=`probe-${randomUUID()}`;const authId=randomUUID();let adminId:string|undefined;
try{
  adminId=(await pool.query("INSERT INTO app_user(auth_id,email,full_name,role) VALUES($1,$2,'Probe admin','admin') RETURNING id",[authId,`${prefix}@example.invalid`])).rows[0].id;
  const command=async(input:unknown,key=randomUUID())=>runCommand(pool,authId,{key,command:input},identities);
  const student=await command({operation:"createUser",email:`${prefix}-s@example.invalid`,fullName:"Student",role:"student"});
  const teacher=await command({operation:"createUser",email:`${prefix}-t@example.invalid`,fullName:"Teacher",role:"teacher"});
  const second=await command({operation:"createUser",email:`${prefix}-t2@example.invalid`,fullName:"Teacher 2",role:"teacher"});
  const payload={operation:"createPeriod",name:prefix,startsOn:"2026-09-01",endsOn:"2027-08-31",preparationDeadline:"2027-04-01"};
  const key=randomUUID();const period=await command(payload,key);assert.deepEqual(await command(payload,key),period);
  await assert.rejects(()=>command({...payload,name:"changed"},key));
  const group=await command({operation:"createGroup",periodId:period.id,name:prefix});
  const enrollment=await command({operation:"enroll",studentId:student.id,teacherId:teacher.id,groupId:group.id,specialty:"Economics",language:"en"});
  const duplicate={operation:"enroll",studentId:student.id,teacherId:teacher.id,groupId:group.id,specialty:"Economics",language:"en"};await assert.rejects(()=>command(duplicate));
  const studentAuth=(await pool.query("SELECT auth_id FROM app_user WHERE id=$1",[student.id])).rows[0].auth_id;
  await assert.rejects(()=>runCommand(pool,studentAuth,{key:randomUUID(),command:payload},identities));
  await assert.rejects(()=>runCommand(pool,studentAuth,{key:randomUUID(),command:{operation:"updateUser",id:student.id,version:1,fullName:"Self",role:"admin",active:true}},identities));
  await runCommand(pool,studentAuth,{key:randomUUID(),command:{operation:"updateProfile",id:enrollment.id,version:1,dissertationTopic:"Research",supervisorName:"Professor"}},identities);
  await assert.rejects(()=>runCommand(pool,studentAuth,{key:randomUUID(),command:{operation:"updateProfile",id:randomUUID(),version:1,dissertationTopic:"Research",supervisorName:"Professor"}},identities));
  await command({operation:"assign",id:enrollment.id,version:2,teacherId:second.id,groupId:group.id});
  assert.equal((await pool.query("SELECT teacher_id FROM enrollment WHERE id=$1",[enrollment.id])).rows[0].teacher_id,second.id);
  await assert.rejects(()=>command({operation:"assign",id:enrollment.id,version:2,teacherId:teacher.id,groupId:group.id}));
  await command({operation:"updateUser",id:student.id,version:1,fullName:"Student",role:"student",active:false});
  await assert.rejects(()=>runCommand(pool,studentAuth,{key:randomUUID(),command:{operation:"updateProfile",id:enrollment.id,version:3,dissertationTopic:"No",supervisorName:""}},identities));
  await assert.rejects(()=>command({operation:"updateUser",id:adminId,version:1,fullName:"Admin",role:"student",active:true}));
  assert.ok((await pool.query("SELECT count(*) FROM audit_event WHERE actor_id=$1",[adminId])).rows[0].count>0);
  console.log("PASS education: admin operations, idempotency, duplicate enrollment, student privilege denial, owner checks, version conflicts, reassignment, deactivation, self-demotion denial, audit");
}finally{
  const c=await pool.connect();try{await c.query("BEGIN");const ids=(await c.query("SELECT id FROM app_user WHERE email LIKE $1",[`${prefix}%`])).rows.map(x=>x.id);
  await c.query("DELETE FROM idempotency_request WHERE actor_id=ANY($1::uuid[])",[ids]);await c.query("DELETE FROM audit_event WHERE actor_id=ANY($1::uuid[])",[ids]);await c.query("DELETE FROM enrollment WHERE student_id=ANY($1::uuid[]) OR teacher_id=ANY($1::uuid[])",[ids]);await c.query("DELETE FROM student_profile WHERE user_id=ANY($1::uuid[])",[ids]);await c.query("DELETE FROM teacher_profile WHERE user_id=ANY($1::uuid[])",[ids]);await c.query("DELETE FROM academic_group WHERE name=$1",[prefix]);await c.query("DELETE FROM academic_period WHERE name=$1",[prefix]);await c.query("DELETE FROM app_user WHERE id=ANY($1::uuid[])",[ids]);await c.query("COMMIT");}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();await pool.end();}
}
console.log("Fixture cleanup complete"); process.exit(0);
