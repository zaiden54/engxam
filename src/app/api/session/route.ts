import { currentActor } from "@/modules/identity/session";
export async function GET() {
  try {await currentActor();return Response.json({authenticated:true},{headers:{"Cache-Control":"no-store"}});}
  catch{return Response.json({authenticated:false},{status:401,headers:{"Cache-Control":"no-store"}});}
}
