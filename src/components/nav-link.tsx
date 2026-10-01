"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({
  href,
  children,
  exact = false,
}: {
  href: string;
  children: ReactNode;
  exact?: boolean;
}) {
  const path = usePathname();
  const current = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} className={current ? "btn btn-ghost is-current shrink-0" : "btn btn-ghost shrink-0"} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}
