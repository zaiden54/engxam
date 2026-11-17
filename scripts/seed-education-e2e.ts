import nextEnv from "@next/env";
import { readFileSync,writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID,randomBytes } from "node:crypto";
import { Pool } from "pg";
import { execFileSync } from "node:child_process";
nextEnv.loadEnvConfig(process.cwd());const env=parseEnv(readFileSync(".env.stage02","utf8"));
if(env.NEON_BRANCH!=="engxam-stage02")throw Error("Test branch required");
const pool=new Pool({connectionString:env.DATABASE_URL});const people=[];
try{for(const role of ["admin","teacher","student"]){
  const email=`engxam-e2e-${randomUUID()}@example.invalid`;const password=randomBytes(24).toString("hex");
  const response=await fetch(`${env.NEON_AUTH_BASE_URL}/sign-up/email`,{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://localhost:3000"},body:JSON.stringify({email,password,name:`E2E ${role}`})});
  if(!response.ok)throw Error(`Signup failed ${response.status}`);const result=await response.json();const authId=result.user.id as string;
  if(role==="admin"){execFileSync("cmd.exe",["/d","/s","/c",`neon neon-auth user set-role ${authId} --roles admin --branch engxam-stage02`],{stdio:"pipe"});}
  const row=await pool.query("INSERT INTO app_user(auth_id,email,full_name,role) VALUES($1,$2,$3,$4) RETURNING id",[authId,email,`E2E ${role}`,role]);
  if(role!=="admin")await pool.query(`INSERT INTO ${role==="teacher"?"teacher_profile":"student_profile"}(user_id) VALUES($1)`,[row.rows[0].id]);
  people.push({role,email,password,id:row.rows[0].id,authId});
}writeFileSync(".env.stage02-fixtures.json",JSON.stringify(people));console.log("Test branch fixtures prepared; credentials hidden");}finally{await pool.end();}
process.exit(0);
