import {timingSafeEqual} from "node:crypto";
import {getPool} from "@/lib/db/pool";
import {getStorage,storageBucket} from "@/lib/storage";
import {cleanupUploads} from "@/modules/files/service";
import {apiFailure} from "@/lib/http";
export const maxDuration=60;
export async function GET(request:Request){
  const secret=process.env.CRON_SECRET;const token=request.headers.get("authorization")??"";const expected=`Bearer ${secret}`;
  if(!secret||secret.length<32||Buffer.byteLength(token)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(token),Buffer.from(expected)))return Response.json({error:"Unauthorized"},{status:401});
  try{return Response.json(await cleanupUploads(getPool(),{client:getStorage(),bucket:storageBucket}),{headers:{"Cache-Control":"no-store"}});}catch(e){return apiFailure(e);}
}
