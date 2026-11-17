"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/", label: "Обзор приложения", path: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  { href: "/account", label: "Личный кабинет", path: "M20 21v-2a7 7 0 0 0-14 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" },
  { href: "/login", label: "Вход", path: "M14 3h6v18h-6M3 12h12M10 7l5 5-5 5" },
];

export function AppNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Основная навигация">{destinations.map(item => {
    const active = pathname === item.href || (item.href === "/account" && ["/library", "/glossary"].includes(pathname)) || (item.href === "/login" && pathname === "/password");
    return <Link key={item.href} href={item.href} aria-current={active ? pathname === item.href ? "page" : "location" : undefined}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.path} /></svg>
      <span className="nav-full-label">{item.label}</span>
      <span className="nav-short-label">{item.href === "/" ? "Обзор" : item.href === "/account" ? "Кабинет" : item.label}</span>
    </Link>;
  })}</nav>;
}
