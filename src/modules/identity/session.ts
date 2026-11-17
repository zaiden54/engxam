import "server-only";
import { getAuth, getPageSession } from "@/lib/auth/server";
import { getDatabase } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import type { Actor } from "./policy";
export async function currentActor(context: "request" | "page" = "request"): Promise<Actor> {
  const { data: session, error } = await (context === "page" ? getPageSession() : getAuth().getSession());
  if (error && error.status !== 401) throw new AppError("UNAVAILABLE", "Не удалось проверить сессию. Попробуйте ещё раз.");
  if (!session?.user) throw new AppError("UNAUTHENTICATED", "Войдите в приложение.");
  const [user] = await getDatabase().select().from(users).where(eq(users.authId,session.user.id));
  if (!user?.active) throw new AppError("FORBIDDEN", "Доступ ещё не назначен или отключён администратором.");
  return user;
}
