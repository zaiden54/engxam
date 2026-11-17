import nextEnv from "@next/env";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
nextEnv.loadEnvConfig(process.cwd());
if(process.env.ENGXAM_ENV_FILE)Object.assign(process.env,parseEnv(readFileSync(process.env.ENGXAM_ENV_FILE,"utf8")));
const [email]=process.argv.slice(2);if(!email)throw Error("Usage: npm run admin:bootstrap -- email");
const pool=new Pool({connectionString:process.env.DATABASE_URL_UNPOOLED});
try{
  const c=await pool.connect();try{await c.query("BEGIN");await c.query("SELECT pg_advisory_xact_lock(74822102)");
    // Read managed identity, never create or modify Better Auth tables.
    const found=await c.query('SELECT id,email,name,role FROM neon_auth."user" WHERE lower(email)=lower($1)',[email]);
    const identity=found.rows[0];if(!identity||!String(identity.role).split(",").includes("admin"))throw Error("Create the Neon Auth user and grant its admin role via Neon CLI first");
    const existing=await c.query("SELECT id FROM app_user WHERE role='admin'");
    if(existing.rowCount)throw Error("An application administrator already exists. Use the application for further changes.");
    const result=await c.query("INSERT INTO app_user(auth_id,email,full_name,role) VALUES($1,$2,$3,'admin') RETURNING id",[identity.id,identity.email.toLowerCase(),identity.name]);
    await c.query("INSERT INTO audit_event(actor_id,action,entity_id,details,request_id) VALUES($1,'bootstrapAdmin',$1,'{}',$2)",[result.rows[0].id,randomUUID()]);await c.query("COMMIT");console.log("First application administrator created");
  }catch(error){await c.query("ROLLBACK");throw error;}finally{c.release();}
}catch(error){console.error(error instanceof Error?error.message:"Bootstrap failed");process.exitCode=1;}finally{await pool.end();}
process.exit(process.exitCode ?? 0);
