import {NextRequest} from "next/server";
import {z} from "zod";
import {currentActor} from "@/modules/identity/session";
import {getPool} from "@/lib/db/pool";
import {getStorage,storageBucket} from "@/lib/storage";
import {finalizeUpload} from "@/modules/files/service";
import {apiFailure,requireSameOrigin} from "@/lib/http";
export const maxDuration=60;
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){try{requireSameOrigin(request);const actor=await currentActor();const id=z.uuid().parse((await params).id);return Response.json(await finalizeUpload(getPool(),{client:getStorage(),bucket:storageBucket},actor.id,id),{headers:{"Cache-Control":"no-store"}});}catch(e){return apiFailure(e);}}
