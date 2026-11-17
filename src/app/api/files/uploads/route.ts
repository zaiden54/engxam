import {NextRequest} from "next/server";
import {currentActor} from "@/modules/identity/session";
import {getPool} from "@/lib/db/pool";
import {getStorage,storageBucket} from "@/lib/storage";
import {initiateUpload} from "@/modules/files/service";
import {apiFailure,requireSameOrigin} from "@/lib/http";
export async function POST(request:NextRequest){try{requireSameOrigin(request);const actor=await currentActor();return Response.json(await initiateUpload(getPool(),{client:getStorage(),bucket:storageBucket},actor.id,await request.json()),{headers:{"Cache-Control":"no-store"}});}catch(e){return apiFailure(e);}}
