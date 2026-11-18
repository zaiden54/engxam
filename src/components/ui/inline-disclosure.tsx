"use client";

import type { ComponentProps, ReactNode } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { Button } from "./button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

export function InlineDisclosure({ label, children, className, triggerClassName, triggerVariant = "outline", onOpenChange }: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  triggerClassName?: string;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  onOpenChange?: (open: boolean) => void;
}) {
  const hydrated = useHydrated();
  return <Collapsible className={className} onOpenChange={onOpenChange}>
    <CollapsibleTrigger asChild>
      <Button type="button" variant={triggerVariant} disabled={!hydrated} className={`h-auto min-h-8 max-w-full py-1.5 whitespace-normal ${triggerClassName ?? ""}`}>{label}</Button>
    </CollapsibleTrigger>
    <CollapsibleContent forceMount className="mt-3 data-[state=closed]:hidden">{children}</CollapsibleContent>
  </Collapsible>;
}
