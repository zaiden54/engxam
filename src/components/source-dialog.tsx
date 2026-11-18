"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useHydrated } from "@/lib/use-hydrated";

type DialogControls = { close: () => void; setBusy: (busy: boolean) => void };
const DialogContext = createContext<DialogControls | null>(null);

export function useDialog() {
  const controls = useContext(DialogContext);
  if (!controls) throw new Error("Dialog controls require a Dialog parent");
  return controls;
}

export function SourceDialog({ trigger, title, children }: { trigger: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();
  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!busy) setOpen(nextOpen); }}>
      <DialogTrigger asChild>
        <Button type="button" disabled={!hydrated}>{trigger}</Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
        onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
        onInteractOutside={event => { if (busy) event.preventDefault(); }}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContext.Provider value={{ close: () => setOpen(false), setBusy }}>
          {children}
        </DialogContext.Provider>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={busy}>Закрыть</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
