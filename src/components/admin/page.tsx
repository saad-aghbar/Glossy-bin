import type { ReactNode } from "react";

export function AdminPage({
  title,
  description,
  action,
  width = "wide",
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  width?: "wide" | "narrow";
  children: ReactNode;
}) {
  return (
    <section className={width === "narrow" ? "admin-page is-narrow" : "admin-page"}>
      <header className="admin-page-head">
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
