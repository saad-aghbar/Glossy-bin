"use client";

import { useRef, type ReactNode } from "react";

export function MobileNav({ children }: { children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={details}
      className="nav-drawer md:hidden"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) details.current?.removeAttribute("open");
      }}
    >
      <summary>القائمة</summary>
      <nav aria-label="قائمة الجوال">{children}</nav>
    </details>
  );
}
