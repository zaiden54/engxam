import { NextRequest } from "next/server";
import { workspace } from "@/modules/education/queries";
import { currentActor } from "@/modules/identity/session";
import { runCommand } from "@/modules/education/service";
import { identityAdmin } from "@/modules/identity/admin";
import { getPool } from "@/lib/db/pool";
import { AppError,publicError } from "@/lib/errors";
import { randomUUID } from "node:crypto";
function failure(error:unknown){const status=error instanceof AppError?({UNAUTHENTICATED:401,FORBIDDEN:403,NOT_FOUND:404,CONFLICT:409,VALIDATION_ERROR:400,UNAVAILABLE:503}[error.code]):503;return Response.json(publicError(error,randomUUID()),{status,headers:{"Cache-Control":"no-store"}});}
export async function GET(request:NextRequest){try{return Response.json(await workspace(await currentActor(), Number(request.nextUrl.searchParams.get("page")??1)),{headers:{"Cache-Control":"no-store"}});}catch(error){return failure(error);}}
export async function POST(request:NextRequest){try{
  if(request.headers.get("origin")!==request.nextUrl.origin)throw new AppError("FORBIDDEN","Недопустимый источник запроса.");
  const actor=await currentActor();return Response.json(await runCommand(getPool(),actor.authId!,await request.json(),identityAdmin),{headers:{"Cache-Control":"no-store"}});
}catch(error){return failure(error);}}
