"use client";

import { useRef } from "react";
import { NavLink } from "@/components/nav-link";

const links = [
  ["لوحة المبيعات", "/admin", true],
  ["المنتجات", "/admin/products", false],
  ["التصنيفات", "/admin/categories", false],
  ["العلامات", "/admin/brands", false],
  ["العروض", "/admin/offers", false],
  ["أكواد الخصم", "/admin/discounts", false],
  ["التوصيل", "/admin/delivery", false],
  ["الطلبات", "/admin/orders", false],
  ["الزبائن", "/admin/customers", false],
  ["الرسائل", "/admin/messages", false],
  ["الصفحات", "/admin/pages", false],
  ["الإعدادات", "/admin/settings", false],
] as const;

function Links() {
  return links.map(([label, href, exact]) => (
    <NavLink key={href} href={href} exact={exact}>
      {label}
    </NavLink>
  ));
}

export function AdminNav() {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <div className="admin-nav">
      <details
        ref={details}
        className="admin-drawer"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) details.current?.removeAttribute("open");
        }}
      >
        <summary>إدارة المتجر</summary>
        <nav aria-label="قائمة الإدارة">
          <Links />
        </nav>
      </details>
      <nav className="admin-links" aria-label="إدارة المتجر">
        <Links />
      </nav>
    </div>
  );
}
