import { z } from "zod";

const databaseSchema = z.object({ DATABASE_URL: z.url().refine(v => /^postgres(ql)?:/.test(v), "PostgreSQL URL required") });
export function databaseEnvironment(input: Record<string, string | undefined> = process.env) {
  const result = databaseSchema.safeParse(input);
  if (!result.success) throw new Error("DATABASE_URL is missing or invalid");
  return result.data;
}
