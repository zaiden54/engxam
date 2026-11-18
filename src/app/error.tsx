"use client";

import { GuestShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { GuestPanel } from "@/components/ui/guest-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatusMessage } from "@/components/ui/states";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <GuestShell><GuestPanel>
    <PageHeader title="Не удалось открыть страницу" />
    <StatusMessage kind="error">Попробуйте ещё раз. Если ошибка повторяется, обратитесь к администратору.</StatusMessage>
    <Button type="button" onClick={reset}>Повторить</Button>
  </GuestPanel></GuestShell>;
}
