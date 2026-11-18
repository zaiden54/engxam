import Link from "next/link";
import type { ReactNode } from "react";
import { StudyMenu, MobileStudyNav } from "./study-menu";
import { ThemeSwitch } from "./theme";
import { SignOut } from "./sign-out";

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
  const links = sections.map(section => ({
    href: studyHref(section, enrollmentId),
    label: labels[section],
    current: section === current,
  }));
  return <div className="site-shell study-shell">
    <header className="site-header">
      <div className="site-width site-header-inner">
        <Brand href={studyHref("home", enrollmentId)}/>
        <div className="site-tools desktop-tools"><ThemeSwitch/><SignOut/></div>
        <StudyMenu links={links}/>
      </div>
    </header>
    <div className="site-width study-layout">
      <nav className="site-nav desktop-study-nav" aria-label="Разделы кабинета">
        {links.map(link => <Link key={link.href} href={link.href}
          aria-current={link.current ? "page" : undefined}>{link.label}</Link>)}
      </nav>
      <main id="main" tabIndex={-1} className="study-main">{children}</main>
    </div>
    <MobileStudyNav links={links}/>
  </div>;
}
