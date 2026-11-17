import {NextRequest} from "next/server";
import {z} from "zod";
import {currentActor} from "@/modules/identity/session";
import {getPool} from "@/lib/db/pool";
import {getStorage,storageBucket} from "@/lib/storage";
import {authorizeDownload} from "@/modules/files/service";
import {apiFailure} from "@/lib/http";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){try{const actor=await currentActor();const id=z.uuid().parse((await params).id);const url=await authorizeDownload(getPool(),{client:getStorage(),bucket:storageBucket},actor.id,id,request.nextUrl.searchParams.get("inline")==="1");return new Response(null,{status:303,headers:{Location:url,"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});}catch(e){return apiFailure(e);}}
