import type { ReactNode } from "react";

export function GuestPanel({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto grid w-full max-w-[490px] gap-4 rounded-lg border border-border border-t-4 border-t-[var(--brand-accent)] bg-card p-[clamp(1rem,4vw,2.25rem)] text-card-foreground">
      {children}
    </section>
  );
}
