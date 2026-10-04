"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/server/actions/account";
import { AdminIcon } from "./icon";
import { adminCrumbs, adminGroups, type AdminLink } from "./nav";

function isCurrent(pathname: string, link: AdminLink) {
  return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
}

function NavMenu({
  label,
  links,
  pathname,
}: {
  label: string;
  links: AdminLink[];
  pathname: string;
}) {
  const current = links.some((link) => isCurrent(pathname, link));
  const item = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const fine = useRef(false);

  function showMenu() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function hideMenuSoon() {
    if (!fine.current) return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  }

  useEffect(() => {
    fine.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        item.current?.querySelector("button")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (links.length === 1) {
    const link = links[0];
    return (
      <Link href={link.href} className={current ? "admin-nav-link is-current" : "admin-nav-link"} aria-current={current ? "page" : undefined}>
        {label}
      </Link>
    );
  }

  return (
    <div
      ref={item}
      className={open ? "admin-nav-item is-open" : "admin-nav-item"}
      onMouseEnter={() => {
        if (fine.current) showMenu();
      }}
      onMouseLeave={hideMenuSoon}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        className={current ? "admin-nav-trigger is-current" : "admin-nav-trigger"}
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!fine.current) setOpen((value) => !value);
        }}
        onFocus={showMenu}
      >
        {label}
        <span className="admin-caret" aria-hidden="true" />
      </button>
      <div className="admin-drop">
        <div className="admin-drop-panel">
          {links.map((link) => {
            const active = isCurrent(pathname, link);
            return (
              <Link key={link.href} href={link.href} className={active ? "admin-link is-current" : "admin-link"} aria-current={active ? "page" : undefined}>
                <AdminIcon name={link.icon} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AdminShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const crumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((part, index, all) => ({
      href: `/${all.slice(0, index + 1).join("/")}`,
      label: adminCrumbs[part] ?? "تفاصيل",
    }));

  useEffect(() => {
    const canvas = document.getElementById("admin-fluid");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canvas || reduce) return;
    canvas.dataset.auto = "yes";
    if (!document.querySelector('script[src="/fluid/webgl-fluid.js"]')) {
      const script = document.createElement("script");
      script.src = "/fluid/webgl-fluid.js";
      script.async = false;
      document.body.appendChild(script);
    }
    void import("html2canvas").then(async (mod) => {
      (window as Window & { html2canvas?: unknown }).html2canvas = mod.default;
      for (const src of ["/liquid-glass/container.js", "/liquid-glass/button.js", "/liquid-glass/expose-globals.js"]) {
        if (document.querySelector(`script[src="${src}"]`)) continue;
        await new Promise<void>((resolve) => {
          const el = document.createElement("script");
          el.src = src;
          el.async = false;
          el.onload = () => resolve();
          el.onerror = () => resolve();
          document.body.appendChild(el);
        });
      }
    });
  }, []);

  return (
    <div className="admin-app">
      <canvas id="admin-fluid" className="admin-fluid" aria-hidden="true" />
      <header className="admin-top">
        <div className="admin-top-inner">
          <Link className="admin-brand" href="/admin">
            Glossy
            <span>الإدارة</span>
          </Link>
          <nav className="admin-nav" aria-label="إدارة المتجر">
            {adminGroups.map((group) => (
              <NavMenu key={group.id} label={group.label} links={group.links} pathname={pathname} />
            ))}
          </nav>
          <div className="admin-account">
            <Link href="/">عرض المتجر</Link>
            <span>{name}</span>
            <form action={logoutAction}>
              <button type="submit">خروج</button>
            </form>
          </div>
        </div>
      </header>
      <div className="admin-workspace">
        <nav className="admin-crumbs" aria-label="مسار الصفحة">
          {crumbs.map((crumb, index) => (
            <span key={crumb.href}>
              {index === crumbs.length - 1 ? <span>{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}
            </span>
          ))}
        </nav>
        <div className="admin-main">{children}</div>
      </div>
    </div>
  );
}
