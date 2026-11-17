import { LoginForm } from "@/components/login-form";
import Link from "next/link";
export default function Login() {
  return <section className="login-card card"><h1>Добро пожаловать</h1><p className="lead">Вход для студентов, преподавателей и администратора.</p>
    <LoginForm />
    <Link className="button" href="/password">Установить или восстановить пароль</Link>
    <p className="muted">Доступ к приложению выдаёт администратор группы.</p>
  </section>;
}
