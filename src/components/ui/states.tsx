import { Alert, AlertDescription } from "./alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./empty";

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <Empty><EmptyHeader><EmptyTitle className="text-base"><h2>{title}</h2></EmptyTitle><EmptyDescription>{children}</EmptyDescription></EmptyHeader></Empty>;
}
export function StatusMessage({ kind, children }: { kind: "success" | "error" | "info"; children: React.ReactNode }) {
  return <Alert variant={kind === "error" ? "destructive" : "default"} role={kind === "error" ? "alert" : "status"}>
    <AlertDescription>{children}</AlertDescription>
  </Alert>;
}
