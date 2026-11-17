import {NextRequest} from "next/server";
import {z} from "zod";
import {currentActor} from "@/modules/identity/session";
import {getPool} from "@/lib/db/pool";
import {apiFailure,requireSameOrigin} from "@/lib/http";
import {glossaryPage,mutateTerm} from "@/modules/glossary/service";
export async function GET(request:NextRequest){try{const actor=await currentActor();const q=request.nextUrl.searchParams;return Response.json(await glossaryPage(getPool(),actor.id,z.uuid().parse(q.get("enrollmentId")),{q:q.get("q")??"",status:q.get("status")??"active",page:Number(q.get("page")??1)}),{headers:{"Cache-Control":"no-store"}});}catch(e){return apiFailure(e);}}
export async function POST(request:NextRequest){try{requireSameOrigin(request);const actor=await currentActor();return Response.json(await mutateTerm(getPool(),actor.id,await request.json()),{headers:{"Cache-Control":"no-store"}});}catch(e){return apiFailure(e);}}
