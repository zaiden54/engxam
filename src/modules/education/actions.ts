"use server";
import { revalidatePath } from "next/cache";
import { currentActor } from "../identity/session";
import { identityAdmin } from "../identity/admin";
import { getPool } from "@/lib/db/pool";
import { publicError } from "@/lib/errors";
import { randomUUID } from "node:crypto";
import { runCommand } from "./service";
export async function educationAction(input:unknown){
  try {const actor=await currentActor();const result=await runCommand(getPool(),actor.authId!,input,identityAdmin);revalidatePath("/account");return {ok:true as const,result};}
  catch(error){return {ok:false as const,error:publicError(error,randomUUID())};}
}
