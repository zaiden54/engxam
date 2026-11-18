"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { SignOut } from "./sign-out";
import { ThemeSwitch } from "./theme";
import { Button } from "./ui/button";
import { useHydrated } from "@/lib/use-hydrated";

type StudyLink = { href: string; label: string; current: boolean };

function StudyLinks({ links, onNavigate }: { links: StudyLink[]; onNavigate?: () => void }) {
  return links.map(({ href, label, current }) =>
    <Link key={href} href={href} onNavigate={onNavigate} aria-current={current ? "page" : undefined}>
      {label}
    </Link>
  );
}

export function StudyMenu({ links }: { links: StudyLink[] }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  function closeMenu() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div className="study-menu" onKeyDown={event => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        closeMenu();
      }
    }}>
      <Button ref={trigger} type="button" variant="outline" disabled={!hydrated} aria-controls={panelId}
        aria-expanded={open} onClick={() => setOpen(!open)}>Меню</Button>
      <div id={panelId} className="study-menu-panel" hidden={!open}>
        <nav className="site-nav tablet-study-nav" aria-label="Разделы кабинета">
          <StudyLinks links={links} onNavigate={closeMenu}/>
        </nav>
        <div className="site-tools"><ThemeSwitch/><SignOut/></div>
      </div>
    </div>
  );
}

export function MobileStudyNav({ links }: { links: StudyLink[] }) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = nav.current;
    if (!element) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--study-nav-height", `${element.offsetHeight}px`);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--study-nav-height");
    };
  }, []);

  return <nav ref={nav} className="site-nav mobile-study-nav" aria-label="Разделы кабинета">
    <StudyLinks links={links}/>
  </nav>;
}
