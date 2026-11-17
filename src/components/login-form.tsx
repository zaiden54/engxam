"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return <form aria-busy={pending} onSubmit={async event => {
    event.preventDefault(); setPending(true); setError("");
    const values = new FormData(event.currentTarget);
    try {
      const result = await authClient.signIn.email({ email: String(values.get("email")), password: String(values.get("password")) });
      if (result.error) { setError("Не удалось войти. Проверьте почту и пароль."); return; }
      router.push("/account"); router.refresh();
    } catch { setError("Сервис временно недоступен. Попробуйте ещё раз."); }
    finally { setPending(false); }
  }}><fieldset disabled={pending}><legend className="sr-only">Вход в кабинет</legend><label htmlFor="email">Электронная почта</label><input id="email" name="email" type="email" spellCheck={false} autoCapitalize="none" autoComplete="username" required /><label htmlFor="password">Пароль</label><input id="password" name="password" type="password" autoComplete="current-password" required />{error && <p role="alert">{error}</p>}<button className="button primary" type="submit">{pending ? "Входим…" : "Войти"}</button></fieldset></form>;
}
