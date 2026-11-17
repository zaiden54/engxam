import {NextRequest} from "next/server";
import {currentActor} from "@/modules/identity/session";
import {getPool} from "@/lib/db/pool";
import {apiFailure,requireSameOrigin} from "@/lib/http";
import {commitBatch} from "@/modules/glossary/service";
import {batchBody} from "@/modules/glossary/http";
export async function POST(request:NextRequest){try{requireSameOrigin(request);const actor=await currentActor();return Response.json(await commitBatch(getPool(),actor.id,await batchBody(request)),{headers:{"Cache-Control":"no-store"}});}catch(e){return apiFailure(e);}}
