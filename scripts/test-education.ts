import nextEnv from "@next/env";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { runCommand,type IdentityAdmin } from "../src/modules/education/service";
import { listLibrary } from "../src/modules/literature/service";
import { glossaryPage } from "../src/modules/glossary/service";
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
  const nextPeriod=await command({...payload,name:`${prefix}-next`});
  const group=await command({operation:"createGroup",periodId:period.id,name:prefix});
  const allGroups=[group,await command({operation:"createGroup",periodId:period.id,name:`${prefix}-systems`}),await command({operation:"createGroup",periodId:nextPeriod.id,name:`${prefix}-economics`})];
  for (const member of allGroups) {
    const appointment={operation:"setGroupTeacher",id:member.id,version:1,teacherId:teacher.id};
    const appointmentKey=randomUUID();
    assert.deepEqual(await command(appointment,appointmentKey),await command(appointment,appointmentKey));
    await assert.rejects(()=>command({...appointment,teacherId:second.id}));
  }
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM academic_group WHERE teacher_id=$1",[teacher.id])).rows[0].count,3);
  const payloadEnrollment={operation:"enroll",studentId:student.id,groupId:group.id,specialty:"Economics",language:"en"};
  const enrollmentRace=await Promise.allSettled([command(payloadEnrollment),command({...payloadEnrollment,groupId:allGroups[2].id})]);
  const wins=enrollmentRace.filter(result=>result.status==="fulfilled");
  assert.equal(wins.length,1);
  const enrollment=wins[0].value;
  const startingGroup=enrollmentRace[0].status==="fulfilled"?group:allGroups[2];
  const destination=startingGroup===group?allGroups[2]:group;
  await assert.rejects(()=>command(payloadEnrollment),{code:"CONFLICT"});
  const studentAuth=(await pool.query("SELECT auth_id FROM app_user WHERE id=$1",[student.id])).rows[0].auth_id;
  await assert.rejects(()=>runCommand(pool,studentAuth,{key:randomUUID(),command:payload},identities));
  await assert.rejects(()=>runCommand(pool,studentAuth,{key:randomUUID(),command:{operation:"updateUser",id:student.id,version:1,fullName:"Self",role:"admin",active:true}},identities));
  await runCommand(pool,studentAuth,{key:randomUUID(),command:{operation:"updateProfile",id:enrollment.id,version:1,dissertationTopic:"Research",supervisorName:"Professor"}},identities);
  await assert.rejects(()=>runCommand(pool,studentAuth,{key:randomUUID(),command:{operation:"updateProfile",id:randomUUID(),version:1,dissertationTopic:"Research",supervisorName:"Professor"}},identities));
  await command({operation:"setGroupTeacher",id:destination.id,version:2,teacherId:second.id});
  assert.equal((await listLibrary(pool,teacher.id,enrollment.id)).canEdit,false);
  await assert.rejects(()=>listLibrary(pool,second.id,enrollment.id),{code:"NOT_FOUND"});
  assert.deepEqual(await command({operation:"assign",id:enrollment.id,version:2,groupId:destination.id}),enrollment);
  assert.deepEqual((await pool.query("SELECT group_id,period_id,dissertation_topic FROM enrollment WHERE id=$1",[enrollment.id])).rows[0],
    {group_id:destination.id,period_id:destination===group?period.id:nextPeriod.id,dissertation_topic:"Research"});
  await assert.rejects(()=>listLibrary(pool,teacher.id,enrollment.id),{code:"NOT_FOUND"});
  assert.equal((await listLibrary(pool,second.id,enrollment.id)).canEdit,false);
  await assert.rejects(()=>command({operation:"assign",id:enrollment.id,version:2,groupId:startingGroup.id}));
  await command({operation:"setGroupTeacher",id:destination.id,version:3,teacherId:teacher.id});
  await assert.rejects(()=>glossaryPage(pool,second.id,enrollment.id),{code:"NOT_FOUND"});
  assert.equal((await glossaryPage(pool,teacher.id,enrollment.id)).canEdit,false);
  const historical=(await pool.query(`
    INSERT INTO enrollment(student_id,group_id,period_id,specialty,current)
    SELECT student_id,group_id,period_id,specialty,false FROM enrollment WHERE id=$1 RETURNING id
  `,[enrollment.id])).rows[0];
  await assert.rejects(()=>glossaryPage(pool,student.id,historical.id),{code:"NOT_FOUND"});
  await assert.rejects(()=>listLibrary(pool,teacher.id,historical.id),{code:"NOT_FOUND"});
  await command({operation:"updateUser",id:student.id,version:1,fullName:"Student",role:"student",active:false});
  await assert.rejects(()=>runCommand(pool,studentAuth,{key:randomUUID(),command:{operation:"updateProfile",id:enrollment.id,version:3,dissertationTopic:"No",supervisorName:""}},identities));
  await assert.rejects(()=>command({operation:"updateUser",id:adminId,version:1,fullName:"Admin",role:"student",active:true}));
  assert.ok((await pool.query("SELECT count(*) FROM audit_event WHERE actor_id=$1",[adminId])).rows[0].count>0);
  console.log("PASS education: three groups, concurrent enrollment, idempotency, version checks, cross-period transfer, access revocation, history, deactivation, audit");
}finally{
  const c=await pool.connect();try{await c.query("BEGIN");const ids=(await c.query("SELECT id FROM app_user WHERE email LIKE $1",[`${prefix}%`])).rows.map(x=>x.id);
  await c.query("DELETE FROM idempotency_request WHERE actor_id=ANY($1::uuid[])",[ids]);await c.query("DELETE FROM audit_event WHERE actor_id=ANY($1::uuid[])",[ids]);await c.query("DELETE FROM enrollment WHERE student_id=ANY($1::uuid[])",[ids]);await c.query("DELETE FROM academic_group WHERE period_id IN (SELECT id FROM academic_period WHERE name=ANY($1::text[]))",[[prefix,`${prefix}-next`]]);await c.query("DELETE FROM academic_period WHERE name=ANY($1::text[])",[[prefix,`${prefix}-next`]]);await c.query("DELETE FROM student_profile WHERE user_id=ANY($1::uuid[])",[ids]);await c.query("DELETE FROM teacher_profile WHERE user_id=ANY($1::uuid[])",[ids]);await c.query("DELETE FROM app_user WHERE id=ANY($1::uuid[])",[ids]);await c.query("COMMIT");}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();await pool.end();}
}
console.log("Fixture cleanup complete"); process.exit(0);
