import type { Metadata } from "next";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import "./globals.css";

export const metadata: Metadata = { title: "Engxam — подготовка к экзамену", description: "Литература, словарь и защиты в одном месте" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>
    <a className="skip-link" href="#main">Перейти к содержимому</a>
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Engxam — главная"><span className="brand-mark">E</span> engxam<span className="brand-dot">.</span></Link>
        <p className="eyebrow nav-label">Подготовка к экзамену</p>
        <AppNavigation />
        <div className="sidebar-note"><strong>Кандидатский экзамен</strong><p>Иностранный язык<br />Подготовка к научной работе</p><Link href="/#goals">Требования к подготовке</Link></div>
      </aside>
      <div className="workspace"><header className="topbar"><span>Иностранный язык <span className="breadcrumb-divider" aria-hidden="true">/</span> <span className="muted">Кандидатский экзамен</span></span><span className="topbar-context">Учебное пространство</span></header>
      <main id="main" tabIndex={-1}>{children}</main><footer>Engxam <span>Последовательно. От первого текста до допуска.</span></footer></div>
    </div>
  </body></html>;
}
