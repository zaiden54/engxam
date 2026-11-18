"use client";

import Form from "next/form";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function MaterialFilters({ action, enrollmentId, query, label, placeholder, applied, children }: {
  action: "/library" | "/glossary";
  enrollmentId: string;
  query: string;
  label: string;
  placeholder: string;
  applied: string[];
  children: ReactNode;
}) {
  const filterId = useId();
  const hydrated = useHydrated();
  const [expanded, setExpanded] = useState(false);
  const conditions = query ? [`Поиск «${query}»`, ...applied] : applied;

  return <Form className="library-filters" autoComplete="off" action={action} role="search" aria-label="Поиск и фильтры">
    <input type="hidden" name="enrollmentId" value={enrollmentId}/>
    <div className="material-search">
      <label>{label}<Input type="search" name="q" defaultValue={query} maxLength={200} placeholder={placeholder}/></label>
      <Button type="submit">Найти</Button>
    </div>
    <div className="material-filter-toolbar">
      <div className="filter-toggle">
        <Button type="button" variant="outline" disabled={!hydrated} aria-expanded={expanded}
          aria-controls={filterId} onClick={() => setExpanded(!expanded)}>Фильтры</Button>
      </div>
      {conditions.length > 0 && <>
        <p>Применены: {conditions.join(" · ")}</p>
        <Button asChild variant="link">
          <Link href={`${action}?${new URLSearchParams({ enrollmentId })}`}>Сбросить</Link>
        </Button>
      </>}
    </div>
    <div id={filterId} className="material-filter-options" data-expanded={expanded}>
      {children}
      <Button type="submit" variant="outline">Применить фильтры</Button>
    </div>
  </Form>;
}
