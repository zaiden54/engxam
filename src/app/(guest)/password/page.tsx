import Link from "next/link";
import { PasswordForm } from "@/components/password-form";
import { Button } from "@/components/ui/button";
import { GuestPanel } from "@/components/ui/guest-panel";
import { PageHeader } from "@/components/ui/page-header";

export default function PasswordPage() {
  return <GuestPanel>
    <PageHeader title="Установить пароль" description="Для первого входа или восстановления доступа запросите одноразовый код на почту. Минимум 12 символов для нового пароля." />
    <PasswordForm />
    <Button asChild variant="outline"><Link href="/login">Вернуться ко входу</Link></Button>
  </GuestPanel>;
}
