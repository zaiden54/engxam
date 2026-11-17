import { getAuth } from "@/lib/auth/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
type Context = { params: Promise<{ path: string[] }> };
// Public registration is deliberately unavailable in this application.
async function handle(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const allowed = ["sign-in/email", "sign-out", "get-session", "email-otp/request-password-reset", "email-otp/reset-password"];
  if (!allowed.includes(path.join("/"))) return Response.json({ error: "Not found" }, { status: 404 });
  if(request.method==="POST"&&path.join("/")==="email-otp/reset-password"){
    const parsed=z.object({email:z.email(),otp:z.string().regex(/^\d{6}$/),password:z.string().min(12).max(128)}).strict().safeParse(await request.clone().json().catch(()=>null));
    if(!parsed.success)return Response.json({error:"Проверьте почту, шестизначный код и пароль (12–128 символов)."},{status:400});
  }
  const handlers = getAuth().handler();
  const method = request.method as keyof typeof handlers;
  return handlers[method](request, context);
}
export { handle as GET, handle as POST };
