import { LoginForm } from "@/components/login-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GuestPanel } from "@/components/ui/guest-panel";
import { PageHeader } from "@/components/ui/page-header";
export default function Login() {
  return <GuestPanel><PageHeader title="Вход в кабинет" />
    <LoginForm />
    <Button asChild variant="outline" className="h-auto min-h-8 whitespace-normal py-2"><Link href="/password">Установить или восстановить пароль</Link></Button>
    <p className="muted">Доступ к приложению выдаёт администратор группы.</p>
  </GuestPanel>;
}
