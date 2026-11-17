import {createHash,randomUUID} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {AppError} from "../../lib/errors";
import {saveSchema,archiveSchema} from "./schemas";
import {authorizeEnrollment} from "./access";
import {inTransaction,audit} from "../files/service";
async function prior(c:PoolClient,actorId:string,operation:string,key:string,input:unknown){
  const hash=createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const old=(await c.query("SELECT payload_hash,result FROM idempotency_request WHERE actor_id=$1 AND operation=$2 AND key=$3",[actorId,operation,key])).rows[0];
  if(old&&old.payload_hash!==hash)throw new AppError("CONFLICT","Ключ запроса использован с другими данными.");return {hash,result:old?.result};
}
async function remember(c:PoolClient,actorId:string,operation:string,key:string,hash:string,result:unknown){await c.query("INSERT INTO idempotency_request(actor_id,operation,key,payload_hash,result) VALUES($1,$2,$3,$4,$5)",[actorId,operation,key,hash,JSON.stringify(result)]);}
function constraintError(e:unknown):never{if((e as {code:string}).code==="23505")throw new AppError("CONFLICT","Работа с этим DOI или PDF уже существует.");throw e;}
export async function saveLiterature(pool:Pool,actorId:string,input:unknown){
  const parsed=saveSchema.safeParse(input);if(!parsed.success)throw new AppError("VALIDATION_ERROR",parsed.error.issues[0]?.message??"Проверьте поля карточки.");const data=parsed.data;const m=data.metadata;
  try{return await inTransaction(pool,async c=>{
    await authorizeEnrollment(c,actorId,data.enrollmentId,true);
    const replay=await prior(c,actorId,"saveLiterature",data.key,data);if(replay.result)return replay.result as {id:string;warning:string|null};
    let id=data.id;let revisionNo=1;
    if(id){
      const old=(await c.query("SELECT l.*,r.file_id,r.revision_no FROM literature l JOIN literature_revision r ON r.id=l.current_revision_id WHERE l.id=$1 AND l.enrollment_id=$2 FOR UPDATE OF l",[id,data.enrollmentId])).rows[0];
      if(!old)throw new AppError("NOT_FOUND","Материал недоступен.");if(old.version!==data.version)throw new AppError("CONFLICT","Карточка изменилась. Обновите страницу.");
      if(old.archived_at)throw new AppError("CONFLICT","Сначала восстановите материал из архива.");
      if(old.file_id!==m.fileId&&(old.file_locked_at||old.pending_defense_count>0))throw new AppError("CONFLICT","PDF нельзя заменить после зачёта или при открытой защите.");revisionNo=old.revision_no+1;
    }
    const file=(await c.query("SELECT * FROM file_asset WHERE id=$1 AND enrollment_id=$2 AND status='ready' FOR SHARE",[m.fileId,data.enrollmentId])).rows[0];if(!file)throw new AppError("VALIDATION_ERROR","Выберите свой проверенный PDF.");
    const reused=await c.query("SELECT literature_id FROM literature_revision WHERE file_id=$1 AND ($2::uuid IS NULL OR literature_id<>$2) LIMIT 1",[m.fileId,id??null]);
    if(reused.rowCount)throw new AppError("CONFLICT","Этот PDF уже связан с другой работой. Откройте существующую карточку.");
    const warning=(await c.query("SELECT 1 FROM literature l JOIN literature_revision r ON r.id=l.current_revision_id WHERE l.enrollment_id=$1 AND lower(r.title)=lower($2) AND lower(r.authors)=lower($3) AND ($4::uuid IS NULL OR l.id<>$4) LIMIT 1",[data.enrollmentId,m.title,m.authors,id??null])).rowCount?"В библиотеке есть материал с таким названием и авторами. Проверьте, не дубликат ли это.":null;
    if(!id){id=randomUUID();await c.query("INSERT INTO literature(id,enrollment_id,material_type,canonical_doi) VALUES($1,$2,$3,$4)",[id,data.enrollmentId,m.materialType,m.doi||null]);}
    const revisionId=randomUUID();
    await c.query("INSERT INTO literature_revision(id,literature_id,enrollment_id,revision_no,title,authors,publication_year,publication_source,url,publication_pages,declared_characters,declared_words,file_id,created_by,doi,material_type_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)",[revisionId,id,data.enrollmentId,revisionNo,m.title,m.authors,m.publicationYear,m.publicationSource,m.url||null,m.publicationPages,m.declaredCharacters,m.declaredWords,m.fileId,actorId,m.doi||null,m.materialType]);
    await c.query("UPDATE literature SET current_revision_id=$2,material_type=$3,canonical_doi=$4,version=version+CASE WHEN $5>1 THEN 1 ELSE 0 END WHERE id=$1",[id,revisionId,m.materialType,m.doi||null,revisionNo]);
    await audit(c,actorId,revisionNo===1?"createLiterature":"reviseLiterature",id,{revisionId,revisionNo});const result={id,warning};await remember(c,actorId,"saveLiterature",data.key,replay.hash,result);return result;
  });}catch(e){constraintError(e);}
}
export async function archiveLiterature(pool:Pool,actorId:string,input:unknown){
  const parsed=archiveSchema.safeParse(input);if(!parsed.success)throw new AppError("VALIDATION_ERROR","Проверьте запрос.");const data=parsed.data;
  return inTransaction(pool,async c=>{
    const owner=(await c.query("SELECT enrollment_id FROM literature WHERE id=$1",[data.id])).rows[0];if(!owner)throw new AppError("NOT_FOUND","Материал недоступен.");await authorizeEnrollment(c,actorId,owner.enrollment_id,true);
    const replay=await prior(c,actorId,"archiveLiterature",data.key,data);if(replay.result)return replay.result;
    const row=(await c.query("UPDATE literature SET archived_at=CASE WHEN $2 THEN now() ELSE NULL END,version=version+1 WHERE id=$1 AND version=$3 AND pending_defense_count=0 RETURNING id",[data.id,data.archive,data.version])).rows[0];if(!row)throw new AppError("CONFLICT","Карточка изменилась или есть открытая защита.");
    await audit(c,actorId,data.archive?"archiveLiterature":"restoreLiterature",data.id);await remember(c,actorId,"archiveLiterature",data.key,replay.hash,row);return row;
  });
}
export async function listLibrary(pool:Pool,actorId:string,enrollmentId:string,options:{q?:string;type?:string;archived?:boolean;page?:number}={}){
  return inTransaction(pool,async c=>{const actor=await authorizeEnrollment(c,actorId,enrollmentId);const page=Number.isSafeInteger(options.page)&&options.page!>0&&options.page!<10000?options.page!:1;
    const rows=await c.query(`SELECT l.id,l.version,l.material_type as "materialType",l.canonical_doi as doi,l.archived_at as "archivedAt",l.file_locked_at as "fileLockedAt",l.pending_defense_count as "pendingDefenseCount",r.id as "revisionId",r.revision_no as "revisionNo",r.title,r.authors,r.publication_year as "publicationYear",r.publication_source as "publicationSource",r.url,r.publication_pages as "publicationPages",r.declared_characters as "declaredCharacters",r.declared_words as "declaredWords",r.file_id as "fileId",f.page_count as "pageCount",f.original_name as "originalName",r.created_at as "createdAt" FROM literature l JOIN literature_revision r ON r.id=l.current_revision_id JOIN file_asset f ON f.id=r.file_id WHERE l.enrollment_id=$1 AND (l.archived_at IS NOT NULL)=$2 AND ($3='' OR r.title ILIKE $3 OR r.authors ILIKE $3) AND ($4='' OR l.material_type=$4) ORDER BY l.created_at DESC,l.id LIMIT 21 OFFSET $5`,[enrollmentId,!!options.archived,options.q?`%${options.q.replace(/[%_\\]/g,"\\$&").slice(0,200)}%`:"",["article","monograph","collection"].includes(options.type??"")?options.type:"",(page-1)*20]);
    const totals=await c.query("SELECT COALESCE(sum(r.declared_characters),0)::text characters,count(*)::int count FROM literature l JOIN literature_revision r ON r.id=l.current_revision_id WHERE l.enrollment_id=$1 AND l.archived_at IS NULL",[enrollmentId]);
    return {enrollmentId,canEdit:actor.role==="student",items:rows.rows.slice(0,20),page,hasNext:rows.rows.length>20,totals:totals.rows[0]};
  });
}
export async function history(pool:Pool,actorId:string,id:string){return inTransaction(pool,async c=>{
  const row=(await c.query("SELECT enrollment_id FROM literature WHERE id=$1",[id])).rows[0];if(!row)throw new AppError("NOT_FOUND","Материал недоступен.");await authorizeEnrollment(c,actorId,row.enrollment_id);
  return (await c.query("SELECT r.id,r.revision_no as \"revisionNo\",r.title,r.authors,r.file_id as \"fileId\",r.declared_characters as \"declaredCharacters\",r.created_at as \"createdAt\" FROM literature_revision r WHERE r.literature_id=$1 ORDER BY r.revision_no DESC",[id])).rows;
});}
