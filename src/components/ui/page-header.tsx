import type { ReactNode } from "react";

export function PageHeader({ title, description, children }: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return <header className="resource-header">
    <div className="resource-heading"><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {children && <div className="resource-context">{children}</div>}
  </header>;
}
