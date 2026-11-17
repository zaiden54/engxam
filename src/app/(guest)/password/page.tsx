import Link from "next/link";
import { PasswordForm } from "@/components/password-form";
export default function PasswordPage(){return <section className="card login-card"><h1>Установить пароль</h1><p>Для первого входа или восстановления доступа запросите одноразовый код на почту. Минимум 12 символов для нового пароля.</p><PasswordForm/><Link className="button" href="/login">Вернуться ко входу</Link></section>;}
