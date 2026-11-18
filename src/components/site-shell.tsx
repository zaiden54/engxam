import Link from "next/link";
import type { ReactNode } from "react";
import { SignOut } from "./sign-out";
import { ThemeSwitch } from "./theme";
import { Button } from "@/components/ui/button";

function Brand({ href = "/" }: { href?: string }) {
  return <Link className="site-brand" href={href}>Engxam<span>Подготовка к кандидатскому экзамену</span></Link>;
}

export function GuestShell({ children }: { children: ReactNode }) {
  return <div className="site-shell guest-shell">
    <header className="site-header"><div className="site-width site-header-inner"><Brand href="/login"/><ThemeSwitch/></div></header>
    <main id="main" tabIndex={-1} className="site-width guest-main">{children}</main>
  </div>;
}

export const studyRoutes = { home: "/", library: "/library", glossary: "/glossary", account: "/account" };
type Section = keyof typeof studyRoutes;

export function studyHref(section: Section, enrollmentId?: string) {
  return enrollmentId ? `${studyRoutes[section]}?enrollmentId=${encodeURIComponent(enrollmentId)}` : studyRoutes[section];
}

export function StudyShell({ children, current, role, enrollmentId }: {
  children: ReactNode; current: Section; role: "student" | "teacher" | "admin"; enrollmentId?: string;
}) {
  const labels: Record<Section, string> = {
    home: "Главная", library: "Источники", glossary: "Словарь",
    account: role === "student" ? "Профиль" : role === "teacher" ? "Мои студенты" : "Управление",
  };
  const sections: Section[] = role === "admin" ? ["home", "account"] : ["home", "library", "glossary", "account"];
  return <div className="site-shell">
    <header className="site-header">
      <div className="site-width site-header-inner"><Brand href={studyHref("home", enrollmentId)}/><div className="site-tools"><ThemeSwitch/><SignOut/></div></div>
      <nav className="site-width site-nav" aria-label="Разделы кабинета">
        {sections.map(section => <Button key={section} variant="ghost" className="h-auto rounded-none" asChild>
          <Link href={studyHref(section, enrollmentId)} aria-current={section === current ? "page" : undefined}>{labels[section]}</Link>
        </Button>)}
      </nav>
    </header>
    <main id="main" tabIndex={-1} className="site-width study-main">{children}</main>
  </div>;
}
