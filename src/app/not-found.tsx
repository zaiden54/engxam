import Link from "next/link";
import { GuestShell } from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuestPanel } from "@/components/ui/guest-panel";
import { PageHeader } from "@/components/ui/page-header";

export default function NotFound() {
  return <GuestShell><GuestPanel>
    <Badge variant="secondary">404</Badge>
    <PageHeader title="Страница не найдена" />
    <Button asChild><Link href="/">На главную</Link></Button>
  </GuestPanel></GuestShell>;
}
