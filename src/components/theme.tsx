"use client";
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme | undefined; choose: (theme: Theme) => void } | null>(null);
const darkQuery = "(prefers-color-scheme: dark)";
const systemIsDark = () => window.matchMedia(darkQuery).matches;
function subscribe(callback: () => void) {
  const media = window.matchMedia(darkQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function ThemeProvider({ initialTheme, children }: { initialTheme?: Theme; children: ReactNode }) {
  const [theme, setTheme] = useState(initialTheme);
  function choose(next: Theme) {
    document.documentElement.dataset.theme = next;
    document.cookie = `engxam-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setTheme(next);
  }
  return <ThemeContext.Provider value={{ theme, choose }}>{children}</ThemeContext.Provider>;
}

export function ThemeSwitch() {
  const preference = useContext(ThemeContext);
  const systemDark = useSyncExternalStore(subscribe, systemIsDark, () => false);
  if (!preference) throw new Error("ThemeSwitch requires ThemeProvider");
  const dark = preference.theme ? preference.theme === "dark" : systemDark;
  return <Button variant="outline" className="theme-switch" type="button" aria-pressed={dark}
    onClick={() => preference.choose(dark ? "light" : "dark")}>Тёмная тема</Button>;
}
