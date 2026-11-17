export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card"><h2>{title}</h2><p>{children}</p></section>;
}
export function StatusMessage({ kind, children }: { kind: "success" | "error" | "info"; children: React.ReactNode }) {
  return <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}
