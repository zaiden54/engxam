"use client";
import { useId, useRef } from "react";

export function Dialog({ trigger, title, children }: { trigger: string; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  return <><button ref={triggerRef} className="button primary" onClick={() => ref.current?.showModal()}>{trigger}</button>
    <dialog ref={ref} onClose={() => triggerRef.current?.focus()} aria-labelledby={titleId} className="dialog"><h2 id={titleId}>{title}</h2>{children}<form method="dialog"><button className="button primary">Закрыть</button></form></dialog></>;
}
