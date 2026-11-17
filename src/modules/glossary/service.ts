import {createHash,randomUUID} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {AppError} from "../../lib/errors";
import {inTransaction,audit} from "../../lib/db/transaction";
import {authorizeEnrollment} from "../literature/access";
import {commitSchema,mutationSchema,previewSchema,termFields} from "./schemas";
import {cleanTerm,normalizeTerm,MAX_BATCH_BYTES,MAX_BATCH_LINES,type RowInput,type Preview,type PreviewRow,type GlossaryData} from "./model";
const digest=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
function inputError(message:string):never{throw new AppError("VALIDATION_ERROR",message);}
function checkSize(rows:RowInput[]){if(rows.length>MAX_BATCH_LINES||Buffer.byteLength(rows.map(r=>[r.term,r.translation,r.definition,r.context].join("\t")).join("\n"),"utf8")>MAX_BATCH_BYTES)inputError("Пакет ограничен 500 строками и 100 КБ текста.");if(new Set(rows.map(r=>r.line)).size!==rows.length)inputError("Номера строк должны быть уникальными.");}
function rawRows(text:string,sourceIds:string[]):RowInput[]{
  if(Buffer.byteLength(text,"utf8")>MAX_BATCH_BYTES)inputError("Пакет превышает 100 КБ.");
  const lines=text.split(/\r\n|\r|\n/);if(lines.at(-1)==="")lines.pop();if(lines.length>MAX_BATCH_LINES)inputError("Не более 500 строк в одном пакете.");
  return lines.map((line,i)=>{const cells=line.split("\t");return {line:i+1,term:cells[0]??"",translation:cells[1]??"",definition:"",context:cells.length>2?"\u0000Лишние столбцы: оставьте термин и перевод через один TAB.":"",sourceIds};});
}
async function previewRows(c:PoolClient,enrollmentId:string,inputRows:RowInput[]):Promise<Preview>{
  checkSize(inputRows);const keys=[...new Set(inputRows.map(r=>normalizeTerm(r.term)).filter(Boolean))];
  const existing=(await c.query("SELECT id,normalized_term,version,archived_at FROM glossary_term WHERE enrollment_id=$1 AND normalized_term=ANY($2::text[]) ORDER BY normalized_term",[enrollmentId,keys])).rows;
  const existingByKey=new Map(existing.map(t=>[t.normalized_term,t]));
  const sources=[...new Set(inputRows.flatMap(r=>r.sourceIds))];const allowed=new Set((await c.query("SELECT id FROM literature WHERE enrollment_id=$1 AND id=ANY($2::uuid[])",[enrollmentId,sources])).rows.map(r=>r.id));
  const seen=new Map<string,number>();
  const rows:PreviewRow[]=inputRows.map(r=>{
    const row={...r,term:cleanTerm(r.term),translation:r.translation.trim(),definition:r.definition.trim(),context:r.context.trim(),sourceIds:[...new Set(r.sourceIds)].sort()};
    if(!row.term&&!row.translation&&!row.definition&&!row.context)return {...row,status:"empty",message:"Пустая строка"};
    const valid=termFields.safeParse({term:row.term,translation:row.translation,definition:row.definition,context:row.context});
    if(!valid.success||!/[a-z]/i.test(row.term)||/[\p{Cc}\p{Cf}]/u.test(row.term)||[row.translation,row.definition,row.context].some(value=>value.includes("\u0000")))return {...row,status:"error",message:row.context.startsWith("\u0000")?row.context.slice(1):"Термин: 1–200 символов с латинскими буквами; перевод до 1000, определение и контекст до 4000. Управляющие символы недопустимы."};
    if(row.sourceIds.some(id=>!allowed.has(id)))return {...row,status:"error",message:"Источник недоступен в этом обучении."};
    const key=normalizeTerm(row.term);const first=seen.get(key);if(first!==undefined)return {...row,status:"duplicate",message:`Повтор строки ${first}`};seen.set(key,row.line);
    const prior=existingByKey.get(key);if(prior)return {...row,status:prior.archived_at?"archived":"duplicate",message:prior.archived_at?"Термин в архиве — восстановите существующую запись.":"Термин уже есть в словаре; он не будет перезаписан.",existingId:prior.id};
    return {...row,status:row.translation?"new":"draft",message:row.translation?"Новый термин":"Черновик: добавьте перевод перед обсуждением."};
  });
  const counts:Preview["counts"]={new:0,draft:0,duplicate:0,archived:0,error:0,empty:0};for(const row of rows)counts[row.status]++;
  // Includes the versions and archive state of matching dictionary records.
  return {rows,counts,token:digest({enrollmentId,rows,existing:existing.map(t=>[t.id,t.normalized_term,t.version,!!t.archived_at])})};
}
export async function previewBatch(pool:Pool,actorId:string,input:unknown){const parsed=previewSchema.safeParse(input);if(!parsed.success)inputError("Проверьте формат пакета: до 500 строк.");const data=parsed.data;
  return inTransaction(pool,async c=>{await authorizeEnrollment(c,actorId,data.enrollmentId,true);return previewRows(c,data.enrollmentId,data.rows??rawRows(data.text!,data.sourceIds));});
}
async function replay(c:PoolClient,actorId:string,operation:string,key:string,input:unknown){const hash=digest(input);const old=(await c.query("SELECT payload_hash,result FROM idempotency_request WHERE actor_id=$1 AND operation=$2 AND key=$3",[actorId,operation,key])).rows[0];if(old&&old.payload_hash!==hash)throw new AppError("CONFLICT","Ключ запроса использован с другими данными.");return {hash,result:old?.result};}
async function remember(c:PoolClient,actorId:string,operation:string,key:string,hash:string,result:unknown){await c.query("INSERT INTO idempotency_request(actor_id,operation,key,payload_hash,result) VALUES($1,$2,$3,$4,$5)",[actorId,operation,key,hash,JSON.stringify(result)]);}
export async function commitBatch(pool:Pool,actorId:string,input:unknown){const parsed=commitSchema.safeParse(input);if(!parsed.success)inputError("Проверьте выбранные строки пакета.");const data=parsed.data;
  return inTransaction(pool,async c=>{
    await authorizeEnrollment(c,actorId,data.enrollmentId,true);const prior=await replay(c,actorId,"commitGlossaryBatch",data.key,data);if(prior.result)return prior.result;
    const current=await previewRows(c,data.enrollmentId,data.rows);if(current.token!==data.token)throw new AppError("CONFLICT","Словарь или пакет изменились. Повторите предпросмотр; ничего не сохранено.");
    const selected=new Set(data.selectedLines);if(selected.size!==data.selectedLines.length)inputError("Повторяются выбранные номера строк.");
    const chosen=current.rows.filter(r=>selected.has(r.line));if(chosen.length!==selected.size||chosen.some(r=>r.status!=="new"&&r.status!=="draft"))throw new AppError("CONFLICT","Выбраны дубли или ошибочные строки. Обновите предпросмотр.");
    const records=chosen.map(r=>({...r,id:randomUUID(),revisionId:randomUUID(),normalizedTerm:normalizeTerm(r.term)}));const json=JSON.stringify(records);
    await c.query(`INSERT INTO glossary_term(id,enrollment_id,normalized_term) SELECT x.id,$1,x."normalizedTerm" FROM jsonb_to_recordset($2::jsonb) AS x(id uuid,"normalizedTerm" text)`,[data.enrollmentId,json]);
    await c.query(`INSERT INTO glossary_term_revision(id,term_id,revision_no,term,translation,definition,context,created_by) SELECT x."revisionId",x.id,1,x.term,x.translation,x.definition,x.context,$1 FROM jsonb_to_recordset($2::jsonb) AS x(id uuid,"revisionId" uuid,term text,translation text,definition text,context text)`,[actorId,json]);
    await c.query(`UPDATE glossary_term t SET current_revision_id=x."revisionId" FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,"revisionId" uuid) WHERE t.id=x.id`,[json]);
    const sources=records.flatMap(r=>r.sourceIds.map(literatureId=>({termId:r.id,literatureId})));if(sources.length)await c.query(`INSERT INTO term_source(term_id,literature_id,enrollment_id) SELECT x."termId",x."literatureId",$1 FROM jsonb_to_recordset($2::jsonb) AS x("termId" uuid,"literatureId" uuid)`,[data.enrollmentId,JSON.stringify(sources)]);
    const result={created:records.length,drafts:records.filter(r=>!r.translation).length,duplicates:current.counts.duplicate,archived:current.counts.archived,errors:current.rows.filter(r=>r.status==="error").map(r=>({line:r.line,message:r.message}))};
    await audit(c,actorId,"commitGlossaryBatch",data.enrollmentId,{created:records.map(r=>r.id),counts:result});await remember(c,actorId,"commitGlossaryBatch",data.key,prior.hash,result);return result;
  });
}
export async function mutateTerm(pool:Pool,actorId:string,input:unknown){const parsed=mutationSchema.safeParse(input);if(!parsed.success)inputError("Проверьте поля термина.");const data=parsed.data;
  try{return await inTransaction(pool,async c=>{
    await authorizeEnrollment(c,actorId,data.enrollmentId,true);const prior=await replay(c,actorId,"mutateGlossaryTerm",data.key,data);if(prior.result)return prior.result;
    const old=data.id?(await c.query("SELECT t.*,r.term,r.translation,r.definition,r.context,r.revision_no FROM glossary_term t JOIN glossary_term_revision r ON r.id=t.current_revision_id WHERE t.id=$1 AND t.enrollment_id=$2 FOR UPDATE OF t",[data.id,data.enrollmentId])).rows[0]:null;
    if(data.id&&!old)throw new AppError("NOT_FOUND","Термин недоступен.");if(old&&old.version!==data.version)throw new AppError("CONFLICT","Термин изменился. Обновите страницу.");
    const id=data.id??randomUUID();
    if(data.operation==="archive"){await c.query("UPDATE glossary_term SET archived_at=CASE WHEN $2 THEN now() ELSE NULL END,version=version+1,updated_at=now() WHERE id=$1",[id,data.archive]);}
    else{
      if(old?.archived_at)throw new AppError("CONFLICT","Сначала восстановите термин из архива.");
      const row:RowInput={line:1,...data.fields,sourceIds:data.sourceIds};const normalized=normalizeTerm(row.term);const candidate=await previewRows(c,data.enrollmentId,[row]);
      const evaluated=candidate.rows[0];if(evaluated.status==="error"||evaluated.status==="empty")inputError(evaluated.message);
      if(evaluated.existingId&&evaluated.existingId!==id)throw new AppError("CONFLICT",evaluated.message);
      const fields={term:cleanTerm(row.term),translation:row.translation.trim(),definition:row.definition.trim(),context:row.context.trim()};
      const changed=!old||Object.entries(fields).some(([key,value])=>old[key]!==value);
      if(!old)await c.query("INSERT INTO glossary_term(id,enrollment_id,normalized_term) VALUES($1,$2,$3)",[id,data.enrollmentId,normalized]);
      if(changed){const revisionId=randomUUID();await c.query("INSERT INTO glossary_term_revision(id,term_id,revision_no,term,translation,definition,context,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[revisionId,id,(old?.revision_no??0)+1,fields.term,fields.translation,fields.definition,fields.context,actorId]);await c.query("UPDATE glossary_term SET current_revision_id=$2,normalized_term=$3 WHERE id=$1",[id,revisionId,normalized]);}
      await c.query("DELETE FROM term_source WHERE term_id=$1",[id]);const sources=[...new Set(data.sourceIds)];if(sources.length)await c.query("INSERT INTO term_source(term_id,literature_id,enrollment_id) SELECT $1,unnest($2::uuid[]),$3",[id,sources,data.enrollmentId]);
      if(old)await c.query("UPDATE glossary_term SET version=version+1,updated_at=now() WHERE id=$1",[id]);
    }
    const result={id};await audit(c,actorId,data.operation==="archive"?(data.archive?"archiveTerm":"restoreTerm"):"saveTerm",id);await remember(c,actorId,"mutateGlossaryTerm",data.key,prior.hash,result);return result;
  });}catch(e){if((e as {code:string}).code==="23505")throw new AppError("CONFLICT","Такой термин уже существует, в том числе в архиве.");throw e;}
}
export async function glossaryPage(pool:Pool,actorId:string,enrollmentId:string,options:{q?:string;status?:string;page?:number}={}):Promise<GlossaryData>{return inTransaction(pool,async c=>{
  const actor=await authorizeEnrollment(c,actorId,enrollmentId);const page=Number.isSafeInteger(options.page)&&options.page!>0&&options.page!<=10000?options.page!:1;const status=["draft","ready","archived"].includes(options.status??"")?options.status!:"active";
  const items=await c.query(`SELECT t.id,t.version,t.archived_at as "archivedAt",t.created_at as "createdAt",r.term,r.translation,r.definition,r.context,r.revision_no as "revisionNo",COALESCE((SELECT json_agg(s.literature_id ORDER BY s.literature_id) FROM term_source s WHERE s.term_id=t.id),'[]') as "sourceIds" FROM glossary_term t JOIN glossary_term_revision r ON r.id=t.current_revision_id WHERE t.enrollment_id=$1 AND (t.archived_at IS NOT NULL)=($2='archived') AND ($2 NOT IN ('draft','ready') OR ($2='draft' AND r.translation='') OR ($2='ready' AND r.translation<>'')) AND ($3='' OR r.term ILIKE $3 OR r.translation ILIKE $3) ORDER BY t.normalized_term,t.id LIMIT 26 OFFSET $4`,[enrollmentId,status,options.q?`%${options.q.replace(/[%_\\]/g,"\\$&").slice(0,200)}%`:"",(page-1)*25]);
  const counts=(await c.query("SELECT count(*)::int total,count(*) FILTER(WHERE r.translation='')::int drafts FROM glossary_term t JOIN glossary_term_revision r ON r.id=t.current_revision_id WHERE t.enrollment_id=$1 AND t.archived_at IS NULL",[enrollmentId])).rows[0];
  const sources=(await c.query("SELECT l.id,r.title FROM literature l JOIN literature_revision r ON r.id=l.current_revision_id WHERE l.enrollment_id=$1 ORDER BY r.title,l.id",[enrollmentId])).rows;
  return {enrollmentId,canEdit:actor.role==="student",items:items.rows.slice(0,25),page,hasNext:items.rows.length>25,total:counts.total,drafts:counts.drafts,sources};
});}
