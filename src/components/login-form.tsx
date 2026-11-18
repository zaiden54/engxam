"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useHydrated } from "@/lib/use-hydrated";

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const hydrated = useHydrated();
  return <form method="post" aria-busy={pending} onSubmit={async event => {
    event.preventDefault(); setPending(true); setError("");
    const values = new FormData(event.currentTarget);
    try {
      const result = await authClient.signIn.email({ email: String(values.get("email")), password: String(values.get("password")) });
      if (result.error) { setError("Не удалось войти. Проверьте почту и пароль."); return; }
      window.location.replace("/");
    } catch { setError("Сервис временно недоступен. Попробуйте ещё раз."); }
    finally { setPending(false); }
  }}>
    <fieldset className="grid gap-3" disabled={pending || !hydrated}>
      <legend className="sr-only">Вход в кабинет</legend>
      <Field>
        <FieldLabel htmlFor="email">Электронная почта</FieldLabel>
        <Input id="email" name="email" type="email" spellCheck={false} autoCapitalize="none" autoComplete="username" required />
      </Field>
      <Field>
        <FieldLabel htmlFor="password">Пароль</FieldLabel>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
      <Button type="submit">{pending ? "Входим…" : "Войти"}</Button>
    </fieldset>
  </form>;
}
