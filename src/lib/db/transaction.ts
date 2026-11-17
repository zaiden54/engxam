import {randomUUID} from "node:crypto";
import type {Pool,PoolClient} from "pg";
export async function inTransaction<T>(pool:Pool,fn:(client:PoolClient)=>Promise<T>){const c=await pool.connect();try{await c.query("BEGIN");const result=await fn(c);await c.query("COMMIT");return result;}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}}
export async function audit(c:PoolClient,actorId:string,action:string,id:string,details:unknown={}){await c.query("INSERT INTO audit_event(actor_id,action,entity_id,details,request_id) VALUES($1,$2,$3,$4,$5)",[actorId,action,id,JSON.stringify(details),randomUUID()]);}
