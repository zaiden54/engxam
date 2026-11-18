"use client";

import { SourceDialog, useDialog } from "@/components/source-dialog";
import { Button } from "@/components/ui/button";

function OperationExample() {
  const { setBusy } = useDialog();

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => setBusy(true)}>Начать операцию</Button>
      <Button type="button" variant="outline" onClick={() => setBusy(false)}>Завершить операцию</Button>
    </div>
  );
}

export function DialogExample() {
  return (
    <SourceDialog trigger="Открыть диалог" title="Проверка диалога">
      <OperationExample />
    </SourceDialog>
  );
}
