import "server-only";
import { cookies } from "next/headers";
import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neon/auth/server";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { currentActor } from "./session";

export async function pageActor() {
  if (!(await cookies()).has(NEON_AUTH_SESSION_COOKIE_NAME)) redirect("/login");
  try {
    return await currentActor("page");
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "UNAUTHENTICATED") redirect("/login");
      if (error.code === "FORBIDDEN") return null;
    }
    throw error;
  }
}
