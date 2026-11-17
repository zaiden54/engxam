"use client";
import { useState } from "react";
export function PasswordForm(){
  const [sent,setSent]=useState(false);const [pending,setPending]=useState(false);const [message,setMessage]=useState("");
  return <form className="stack-form" aria-busy={pending} onSubmit={async event=>{event.preventDefault();setPending(true);setMessage("");const data=new FormData(event.currentTarget);try{
    const body=sent?{email:data.get("email"),otp:data.get("otp"),password:data.get("password")}:{email:data.get("email")};
    const response=await fetch(`/api/auth/email-otp/${sent?"reset-password":"request-password-reset"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!response.ok){setMessage(sent?"Не удалось изменить пароль. Проверьте код или запросите новый.":"Не удалось отправить код. Повторите позже.");return;}
    setMessage(sent?"Пароль установлен. Теперь можно войти.":"Если аккаунт существует, код отправлен на почту.");setSent(!sent);
  }catch{setMessage("Нет связи с сервером. Повторите попытку.");}finally{setPending(false);}}}><fieldset disabled={pending}><label>Электронная почта<input type="email" name="email" spellCheck={false} autoCapitalize="none" required autoComplete="username"/></label>{sent&&<><label>Код из письма<input name="otp" spellCheck={false} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6}/></label><label>Новый пароль<input type="password" name="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label></>}<button className="button primary">{pending?"Подождите…":sent?"Установить пароль":"Получить код"}</button>{sent&&<button className="button" type="button" onClick={()=>{setSent(false);setMessage("");}}>Запросить новый код</button>}</fieldset><p role="status">{message}</p></form>;
}
