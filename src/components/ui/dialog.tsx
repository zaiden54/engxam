"use client";
import { createContext, useContext, useId, useRef, useState, type ReactNode } from "react";

type DialogControls = { close: () => void; setBusy: (busy: boolean) => void };
const DialogContext = createContext<DialogControls | null>(null);

export function useDialog() {
  const controls = useContext(DialogContext);
  if (!controls) throw new Error("Dialog controls require a Dialog parent");
  return controls;
}

export function Dialog({ trigger, title, children }: { trigger: string; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const close = () => ref.current?.close();
  return <>
    <button ref={triggerRef} className="button primary" onClick={() => ref.current?.showModal()}>{trigger}</button>
    <dialog ref={ref} onClose={() => triggerRef.current?.focus()} onCancel={event => { if (busy) event.preventDefault(); }}
      aria-labelledby={titleId} className="dialog">
      <h2 id={titleId}>{title}</h2>
      <DialogContext.Provider value={{ close, setBusy }}>{children}</DialogContext.Provider>
      <form method="dialog"><button className="button" disabled={busy}>Закрыть</button></form>
    </dialog>
  </>;
}
