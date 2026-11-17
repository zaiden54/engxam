import nextEnv from "@next/env";
import {readFileSync} from "node:fs";
import {parseEnv} from "node:util";
import {randomUUID} from "node:crypto";
import {Pool} from "pg";
import assert from "node:assert/strict";
import {PDFDocument} from "pdf-lib";
import {DeleteObjectCommand,GetObjectCommand} from "@aws-sdk/client-s3";
import {getStorage,storageBucket} from "../src/lib/storage/client";
import {initiateUpload,finalizeUpload,authorizeDownload,cleanupUploads} from "../src/modules/files/service";
import {saveLiterature,archiveLiterature,listLibrary,history} from "../src/modules/literature/service";
nextEnv.loadEnvConfig(process.cwd());Object.assign(process.env,parseEnv(readFileSync(".env.stage02","utf8")));
if(process.env.NEON_BRANCH!=="engxam-stage02")throw Error("Isolated test branch required");
const pool=new Pool({connectionString:process.env.DATABASE_URL});const storage={client:getStorage(),bucket:storageBucket};
const prefix=`pdf-probe-${randomUUID()}`;const fileIds:string[]=[];const materialIds:string[]=[];const keys:string[]=[];let periodId:string|undefined;let outsider:string|undefined;
try{
  const fixtures=JSON.parse(readFileSync(".env.stage02-fixtures.json","utf8"));const student=fixtures.find((x:{role:string})=>x.role==="student").id;const teacher=fixtures.find((x:{role:string})=>x.role==="teacher").id;const admin=fixtures.find((x:{role:string})=>x.role==="admin").id;
  periodId=(await pool.query("INSERT INTO academic_period(name,starts_on,ends_on,preparation_deadline) VALUES($1,'2026-09-01','2027-08-31','2027-04-01') RETURNING id",[prefix])).rows[0].id;
  const group=(await pool.query("INSERT INTO academic_group(period_id,name) VALUES($1,$2) RETURNING id",[periodId,prefix])).rows[0].id;
  const enrollmentId=(await pool.query("INSERT INTO enrollment(student_id,teacher_id,group_id,period_id,specialty) VALUES($1,$2,$3,$4,'Testing') RETURNING id",[student,teacher,group,periodId])).rows[0].id;
  outsider=(await pool.query("INSERT INTO app_user(auth_id,email,full_name,role) VALUES($1,$2,'Outsider','student') RETURNING id",[randomUUID(),`${prefix}@example.invalid`])).rows[0].id;
  const pdf=await PDFDocument.create();pdf.addPage();pdf.setTitle(prefix);const bytes=Buffer.from(await pdf.save());
  const upload=async(body:Buffer)=>{const key=randomUUID();keys.push(key);const row=await initiateUpload(pool,storage,student,{key,enrollmentId,name:"research.pdf",size:body.length});fileIds.push(row.id);assert.ok((await fetch(row.url!,{method:"PUT",headers:row.headers,body:Uint8Array.from(body).buffer})).ok);return row;};
  const first=await upload(bytes);const finished=await finalizeUpload(pool,storage,student,first.id);assert.equal(finished.pageCount,1);assert.deepEqual(await finalizeUpload(pool,storage,student,first.id),finished);
  assert.equal((await fetch(first.url!,{method:"PUT",headers:first.headers,body:Buffer.from("tampered")})).status,412);
  const key=randomUUID();keys.push(key);const metadata={title:prefix,authors:"Research Author",materialType:"article",publicationYear:2026,publicationSource:"Science",doi:"https://doi.org/10.1000/"+randomUUID(),url:"",publicationPages:"1–10",declaredCharacters:40000,declaredWords:null,fileId:first.id};
  const saved=await saveLiterature(pool,student,{key,enrollmentId,metadata});materialIds.push(saved.id);assert.deepEqual(await saveLiterature(pool,student,{key,enrollmentId,metadata}),saved);
  const teacherUrl=await authorizeDownload(pool,storage,teacher,first.id,false);const downloaded=await fetch(teacherUrl);assert.equal(Buffer.compare(Buffer.from(await downloaded.arrayBuffer()),bytes),0);
  await assert.rejects(()=>authorizeDownload(pool,storage,outsider!,first.id,false));await assert.rejects(()=>authorizeDownload(pool,storage,admin,first.id,false));await assert.rejects(()=>initiateUpload(pool,storage,teacher,{key:randomUUID(),enrollmentId,name:"x.pdf",size:1}));
  await assert.rejects(()=>saveLiterature(pool,outsider!,{key:randomUUID(),enrollmentId,metadata}));
  const key2=randomUUID();keys.push(key2);await saveLiterature(pool,student,{key:key2,id:saved.id,version:1,enrollmentId,metadata:{...metadata,title:prefix+" revised"}});assert.equal((await history(pool,teacher,saved.id)).length,2);
  const replacementPdf=await PDFDocument.create();replacementPdf.addPage();replacementPdf.addPage();replacementPdf.setTitle(prefix+" replacement");const replacement=await upload(Buffer.from(await replacementPdf.save()));await finalizeUpload(pool,storage,student,replacement.id);
  await pool.query("UPDATE literature SET file_locked_at=now() WHERE id=$1",[saved.id]);
  await assert.rejects(()=>saveLiterature(pool,student,{key:randomUUID(),id:saved.id,version:2,enrollmentId,metadata:{...metadata,fileId:replacement.id}}));
  await pool.query("UPDATE literature SET file_locked_at=NULL,pending_defense_count=1 WHERE id=$1",[saved.id]);
  await assert.rejects(()=>saveLiterature(pool,student,{key:randomUUID(),id:saved.id,version:2,enrollmentId,metadata:{...metadata,fileId:replacement.id}}));
  await pool.query("UPDATE literature SET pending_defense_count=0 WHERE id=$1",[saved.id]);const replaceKey=randomUUID();keys.push(replaceKey);await saveLiterature(pool,student,{key:replaceKey,id:saved.id,version:2,enrollmentId,metadata:{...metadata,fileId:replacement.id}});assert.equal((await history(pool,teacher,saved.id)).length,3);
  const archiveKey=randomUUID();keys.push(archiveKey);await archiveLiterature(pool,student,{key:archiveKey,id:saved.id,version:3,archive:true});assert.equal((await listLibrary(pool,student,enrollmentId)).items.length,0);assert.equal((await listLibrary(pool,student,enrollmentId,{archived:true})).items.length,1);
  const dup=await upload(bytes);await assert.rejects(()=>finalizeUpload(pool,storage,student,dup.id));
  const invalid=await upload(Buffer.from("not a PDF"));await assert.rejects(()=>finalizeUpload(pool,storage,student,invalid.id));assert.equal((await pool.query("SELECT status FROM file_asset WHERE id=$1",[invalid.id])).rows[0].status,"failed");
  const orphan=await upload(Buffer.from("orphan bytes"));await pool.query("UPDATE file_asset SET created_at=now()-interval '48 hours',updated_at=now()-interval '48 hours' WHERE id=ANY($1::uuid[])",[fileIds]);await cleanupUploads(pool,storage);
  assert.equal((await pool.query("SELECT status FROM file_asset WHERE id=$1",[first.id])).rows[0].status,"ready");assert.equal((await pool.query("SELECT status FROM file_asset WHERE id=$1",[orphan.id])).rows[0].status,"deleted");
  const stored=await storage.client.send(new GetObjectCommand({Bucket:storage.bucket,Key:(await pool.query("SELECT storage_key FROM file_asset WHERE id=$1",[first.id])).rows[0].storage_key}));assert.equal((await stored.Body!.transformToByteArray()).length,bytes.length);
  await assert.rejects(()=>pool.query("UPDATE enrollment SET teacher_id=$1 WHERE id=$2",[admin,enrollmentId]));
  console.log("PASS library: real direct upload, PDF validation, SHA duplicate, immutable upload, idempotency, teacher download, student/admin isolation, revisions, archive, safe cleanup");
}finally{
  for(const id of fileIds){const row=(await pool.query("SELECT storage_key,temporary_key FROM file_asset WHERE id=$1",[id])).rows[0];if(row)for(const Key of [row.storage_key,row.temporary_key])await storage.client.send(new DeleteObjectCommand({Bucket:storage.bucket,Key}));}
  const c=await pool.connect();try{await c.query("BEGIN");await c.query("DELETE FROM idempotency_request WHERE key=ANY($1::uuid[])",[keys]);await c.query("DELETE FROM audit_event WHERE entity_id=ANY($1::uuid[])",[[...fileIds,...materialIds]]);await c.query("UPDATE literature SET current_revision_id=NULL WHERE id=ANY($1::uuid[])",[materialIds]);await c.query("DELETE FROM literature_revision WHERE literature_id=ANY($1::uuid[])",[materialIds]);await c.query("DELETE FROM literature WHERE id=ANY($1::uuid[])",[materialIds]);await c.query("DELETE FROM file_asset WHERE id=ANY($1::uuid[])",[fileIds]);if(periodId){await c.query("DELETE FROM enrollment WHERE period_id=$1",[periodId]);await c.query("DELETE FROM academic_group WHERE period_id=$1",[periodId]);await c.query("DELETE FROM academic_period WHERE id=$1",[periodId]);}if(outsider)await c.query("DELETE FROM app_user WHERE id=$1",[outsider]);await c.query("COMMIT");}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();await pool.end();storage.client.destroy();}
}
console.log("Library probe fixtures removed");process.exit(0);
