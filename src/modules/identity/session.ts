import "server-only";
import { getAuth } from "@/lib/auth/server";
import { getDatabase } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import type { Actor } from "./policy";
export async function currentActor(): Promise<Actor> {
  const { data: session } = await getAuth().getSession();
  if (!session?.user) throw new AppError("UNAUTHENTICATED", "Войдите в приложение.");
  const [user] = await getDatabase().select().from(users).where(eq(users.authId,session.user.id));
  if (!user?.active) throw new AppError("FORBIDDEN", "Доступ ещё не назначен или отключён администратором.");
  return user;
}
