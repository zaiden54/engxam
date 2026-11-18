"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
export function SignOut() {
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return <><Button type="button" variant="outline" disabled={pending} aria-busy={pending} onClick={async () => { setPending(true); setError(false); try { const result = await authClient.signOut(); if (result.error) throw Error(); router.push("/login"); router.refresh(); } catch { setError(true); } finally { setPending(false); } }}>{pending ? "Выходим…" : "Выйти"}</Button>{error && <p role="alert">Не удалось выйти. Повторите попытку.</p>}</>;
}
