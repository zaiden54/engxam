"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
export function PasswordForm(){
  const [sent,setSent]=useState(false);const [pending,setPending]=useState(false);const [message,setMessage]=useState("");
  return <form className="stack-form" aria-busy={pending} onSubmit={async event=>{event.preventDefault();setPending(true);setMessage("");const data=new FormData(event.currentTarget);try{
    const body=sent?{email:data.get("email"),otp:data.get("otp"),password:data.get("password")}:{email:data.get("email")};
    const response=await fetch(`/api/auth/email-otp/${sent?"reset-password":"request-password-reset"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!response.ok){setMessage(sent?"Не удалось изменить пароль. Проверьте код или запросите новый.":"Не удалось отправить код. Повторите позже.");return;}
    setMessage(sent?"Пароль установлен. Теперь можно войти.":"Если аккаунт существует, код отправлен на почту.");setSent(!sent);
  }catch{setMessage("Нет связи с сервером. Повторите попытку.");}finally{setPending(false);}}}>
    <fieldset disabled={pending}>
      <Field>
        <FieldLabel htmlFor="reset-email">Электронная почта</FieldLabel>
        <Input id="reset-email" type="email" name="email" spellCheck={false} autoCapitalize="none" required autoComplete="username" />
      </Field>
      {sent && <>
        <Field>
          <FieldLabel htmlFor="reset-otp">Код из письма</FieldLabel>
          <Input id="reset-otp" name="otp" spellCheck={false} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} />
        </Field>
        <Field>
          <FieldLabel htmlFor="reset-password">Новый пароль</FieldLabel>
          <Input id="reset-password" type="password" name="password" autoComplete="new-password" required minLength={12} maxLength={128} />
        </Field>
      </>}
      <Button type="submit">{pending ? "Подождите…" : sent ? "Установить пароль" : "Получить код"}</Button>
      {sent && <Button variant="outline" type="button" onClick={() => { setSent(false); setMessage(""); }}>Запросить новый код</Button>}
    </fieldset>
    <p role="status">{message}</p>
  </form>;
}
