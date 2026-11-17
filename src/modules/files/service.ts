import {randomUUID} from "node:crypto";
import type {Pool} from "pg";
import {GetObjectCommand,HeadObjectCommand,PutObjectCommand,DeleteObjectCommand,S3Client} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {AppError} from "../../lib/errors";
import {uploadSchema,MAX_PDF_BYTES} from "../literature/schemas";
import {authorizeEnrollment} from "../literature/access";
import {inspectPdf} from "./pdf";
import {inTransaction,audit} from "../../lib/db/transaction";
export {inTransaction,audit} from "../../lib/db/transaction";
export type Storage={client:S3Client;bucket:string};
type Asset={id:string;enrollment_id:string;uploaded_by:string;temporary_key:string;storage_key:string;original_name:string;expected_size:number;size_bytes:number;page_count:number;sha256:string;status:string};
export async function initiateUpload(pool:Pool,storage:Storage,actorId:string,input:unknown){
  const parsed=uploadSchema.safeParse(input);if(!parsed.success)throw new AppError("VALIDATION_ERROR","Выберите PDF до 50 МБ и обучение.");const data=parsed.data;
  const row=await inTransaction(pool,async c=>{
    await authorizeEnrollment(c,actorId,data.enrollmentId,true);await c.query("SELECT id FROM enrollment WHERE id=$1 FOR UPDATE",[data.enrollmentId]);
    const prior=await c.query<Asset>("SELECT * FROM file_asset WHERE uploaded_by=$1 AND upload_request_id=$2",[actorId,data.key]);
    if(prior.rows[0]){const p=prior.rows[0];if(p.enrollment_id!==data.enrollmentId||p.original_name!==data.name||p.expected_size!==data.size)throw new AppError("CONFLICT","Ключ загрузки уже использован для другого файла.");if(p.status!=="uploading"&&p.status!=="ready")throw new AppError("CONFLICT","Начните новую загрузку.");await c.query("UPDATE file_asset SET updated_at=now() WHERE id=$1",[p.id]);return p;}
    const count=await c.query("SELECT count(*) FILTER(WHERE status='uploading')::int pending,count(*)::int recent FROM file_asset WHERE enrollment_id=$1 AND created_at>now()-interval '1 hour'",[data.enrollmentId]);
    if(count.rows[0].pending>=10||count.rows[0].recent>=100)throw new AppError("CONFLICT","Слишком много загрузок. Завершите текущие или повторите позже.");
    const id=randomUUID();const prefix=`students/${actorId}/${data.enrollmentId}/${id}`;
    const result=await c.query<Asset>("INSERT INTO file_asset(id,enrollment_id,uploaded_by,upload_request_id,temporary_key,storage_key,original_name,expected_size) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[id,data.enrollmentId,actorId,data.key,`${prefix}/upload`,`${prefix}/document.pdf`,data.name,data.size]);
    await audit(c,actorId,"initiateUpload",id,{enrollmentId:data.enrollmentId});return result.rows[0];
  });
  const url=row.status==="ready"?null:await getSignedUrl(storage.client,new PutObjectCommand({Bucket:storage.bucket,Key:row.temporary_key,ContentType:"application/pdf",IfNoneMatch:"*"}),{expiresIn:300});
  return {id:row.id,url,headers:{"Content-Type":"application/pdf","If-None-Match":"*"},status:row.status};
}
async function readBounded(storage:Storage,key:string,expectedSize:number){
  const head=await storage.client.send(new HeadObjectCommand({Bucket:storage.bucket,Key:key}));
  if(head.ContentLength!==expectedSize||!head.ContentLength||head.ContentLength>MAX_PDF_BYTES)throw new AppError("VALIDATION_ERROR","Фактический размер файла отличается от заявленного или превышает 50 МБ.");
  const object=await storage.client.send(new GetObjectCommand({Bucket:storage.bucket,Key:key}));
  if(!object.Body)throw new AppError("UNAVAILABLE","Загрузка ещё не завершена.");
  const chunks:Uint8Array[]=[];let size=0;
  try{for await(const chunk of object.Body as AsyncIterable<Uint8Array>){size+=chunk.length;if(size>MAX_PDF_BYTES||size>expectedSize)throw new AppError("VALIDATION_ERROR","PDF превышает допустимый размер.");chunks.push(chunk);}}finally{if("destroy" in object.Body)(object.Body as {destroy:()=>void}).destroy();}
  if(size!==expectedSize)throw new AppError("VALIDATION_ERROR","Файл загружен не полностью.");return Buffer.concat(chunks);
}
export async function finalizeUpload(pool:Pool,storage:Storage,actorId:string,id:string){
  const asset=(await pool.query<Asset>("SELECT * FROM file_asset WHERE id=$1",[id])).rows[0];if(!asset)throw new AppError("NOT_FOUND","Файл недоступен.");
  try{return await inTransaction(pool,async c=>{
    await authorizeEnrollment(c,actorId,asset.enrollment_id,true);const row=(await c.query<Asset>("SELECT * FROM file_asset WHERE id=$1 FOR UPDATE",[id])).rows[0];
    if(row.uploaded_by!==actorId)throw new AppError("NOT_FOUND","Файл недоступен.");
    if(row.status==="ready")return {id:row.id,pageCount:row.page_count,sizeBytes:row.size_bytes};
    if(row.status!=="uploading")throw new AppError("CONFLICT",row.status==="failed"?"Файл отклонён. Начните новую загрузку.":"Файл недоступен.");
    let bytes:Buffer;try{bytes=await readBounded(storage,row.temporary_key,row.expected_size);}catch(e){if((e as {name:string}).name==="NotFound"||(e as {name:string}).name==="NoSuchKey")throw new AppError("CONFLICT","Файл ещё не загружен. Повторите загрузку.");throw e;}
    const inspected=await inspectPdf(bytes);
    await c.query("SELECT id FROM enrollment WHERE id=$1 FOR UPDATE",[row.enrollment_id]);
    const duplicate=await c.query("SELECT id FROM file_asset WHERE enrollment_id=$1 AND sha256=$2 AND status='ready' AND id<>$3",[row.enrollment_id,inspected.sha256,id]);
    if(duplicate.rowCount)throw new AppError("CONFLICT","Этот PDF уже есть в библиотеке. Используйте существующий материал.");
    try{await storage.client.send(new PutObjectCommand({Bucket:storage.bucket,Key:row.storage_key,Body:bytes,ContentType:"application/pdf",CacheControl:"private, no-store",Metadata:{sha256:inspected.sha256},IfNoneMatch:"*"}));}
    catch(e){if((e as {$metadata?:{httpStatusCode:number}}).$metadata?.httpStatusCode!==412)throw e;const old=await storage.client.send(new HeadObjectCommand({Bucket:storage.bucket,Key:row.storage_key}));if(old.Metadata?.sha256!==inspected.sha256)throw new AppError("CONFLICT","Конечный файл уже зафиксирован с другим содержимым.");}
    await c.query("UPDATE file_asset SET status='ready',size_bytes=$2,page_count=$3,sha256=$4,updated_at=now() WHERE id=$1",[id,inspected.sizeBytes,inspected.pageCount,inspected.sha256]);await audit(c,actorId,"finalizeUpload",id,{pageCount:inspected.pageCount,sizeBytes:inspected.sizeBytes});
    return {id,pageCount:inspected.pageCount,sizeBytes:inspected.sizeBytes};
  });}catch(e){if(e instanceof AppError&&(e.code==="VALIDATION_ERROR"||(e.code==="CONFLICT"&&e.message.startsWith("Этот PDF"))))await pool.query("UPDATE file_asset SET status='failed',failure_reason=$2,updated_at=now() WHERE id=$1 AND uploaded_by=$3 AND status='uploading'",[id,e.message,actorId]);throw e;}
}
export async function authorizeDownload(pool:Pool,storage:Storage,actorId:string,id:string,inline:boolean){
  return inTransaction(pool,async c=>{
    const row=(await c.query<Asset>("SELECT f.* FROM file_asset f WHERE f.id=$1 AND f.status='ready' AND EXISTS(SELECT 1 FROM literature_revision r WHERE r.file_id=f.id)",[id])).rows[0];
    if(!row)throw new AppError("NOT_FOUND","Файл недоступен.");await authorizeEnrollment(c,actorId,row.enrollment_id);
    return getSignedUrl(storage.client,new GetObjectCommand({Bucket:storage.bucket,Key:row.storage_key,ResponseContentType:"application/pdf",ResponseCacheControl:"private, no-store",ResponseContentDisposition:`${inline?"inline":"attachment"}; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(row.original_name.replace(/[\r\n]/g,""))}`}),{expiresIn:60});
  });
}
export async function cleanupUploads(pool:Pool,storage:Storage){
  const candidates=await inTransaction(pool,async c=>{
    // A row lock serialises cleanup against finalization and revision attachment.
    const candidates=await c.query<Asset>("SELECT f.* FROM file_asset f WHERE (f.status IN ('uploading','failed','deleting') OR (f.status='ready' AND NOT EXISTS(SELECT 1 FROM literature_revision r WHERE r.file_id=f.id))) AND f.updated_at<now()-interval '24 hours' ORDER BY f.updated_at LIMIT 20 FOR UPDATE SKIP LOCKED");
    const eligible:Asset[]=[];for(const row of candidates.rows){if((await c.query("SELECT 1 FROM literature_revision WHERE file_id=$1 LIMIT 1",[row.id])).rowCount)continue;await c.query("UPDATE file_asset SET status='deleting',updated_at=now() WHERE id=$1",[row.id]);eligible.push(row);}return eligible;
  });
  // Commit deleting BEFORE external side effects. A failed deletion stays retryable
  // and can never be attached as a ready file after a database rollback.
  let removed=0;for(const row of candidates){await storage.client.send(new DeleteObjectCommand({Bucket:storage.bucket,Key:row.temporary_key}));await storage.client.send(new DeleteObjectCommand({Bucket:storage.bucket,Key:row.storage_key}));await pool.query("UPDATE file_asset SET status='deleted',updated_at=now() WHERE id=$1 AND status='deleting'",[row.id]);removed++;}
  await inTransaction(pool,async c=>{
    // Temporary objects of referenced ready files can be removed once upload URLs expired.
    const temp=await c.query<Asset>("SELECT * FROM file_asset WHERE status='ready' AND temporary_cleaned_at IS NULL AND created_at<now()-interval '1 hour' ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED");
    for(const row of temp.rows){await storage.client.send(new DeleteObjectCommand({Bucket:storage.bucket,Key:row.temporary_key}));await c.query("UPDATE file_asset SET temporary_cleaned_at=now() WHERE id=$1",[row.id]);}
  });
  return {removed};
}
