import {NextRequest} from "next/server";
import {currentActor} from "@/modules/identity/session";
import {getPool} from "@/lib/db/pool";
import {saveLiterature,archiveLiterature,history,listLibrary} from "@/modules/literature/service";
import {apiFailure,requireSameOrigin} from "@/lib/http";
import {z} from "zod";
export async function POST(request:NextRequest){try{requireSameOrigin(request);const actor=await currentActor();return Response.json(await saveLiterature(getPool(),actor.id,await request.json()),{headers:{"Cache-Control":"no-store"}});}catch(e){return apiFailure(e);}}
export async function PATCH(request:NextRequest){try{requireSameOrigin(request);const actor=await currentActor();return Response.json(await archiveLiterature(getPool(),actor.id,await request.json()),{headers:{"Cache-Control":"no-store"}});}catch(e){return apiFailure(e);}}
export async function GET(request:NextRequest){try{const actor=await currentActor();const q=request.nextUrl.searchParams;const data=q.has("history")?await history(getPool(),actor.id,z.uuid().parse(q.get("history"))):await listLibrary(getPool(),actor.id,z.uuid().parse(q.get("enrollmentId")),{q:q.get("q")??"",type:q.get("type")??"",archived:q.get("archived")==="1",page:Number(q.get("page")??1)});return Response.json(data,{headers:{"Cache-Control":"no-store"}});}catch(e){return apiFailure(e);}}
