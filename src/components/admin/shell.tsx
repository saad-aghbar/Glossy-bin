"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FluidCanvas } from "@/components/fluid-canvas";
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

function SheetMark({ name }: { name: "back" | "chevron" }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg className={name === "back" ? "admin-sheet-icon is-back" : "admin-sheet-icon"} viewBox="0 0 24 24" aria-hidden="true">
      {name === "back" ? <path {...stroke} d="M14.5 6.5 8 12l6.5 5.5" /> : null}
      {name === "chevron" ? <path {...stroke} d="m7 10 5 5 5-5" /> : null}
    </svg>
  );
}

function SheetGroup({
  label,
  links,
  pathname,
  open,
  onToggle,
}: {
  label: string;
  links: AdminLink[];
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const current = links.some((link) => isCurrent(pathname, link));
  if (links.length === 1) {
    const link = links[0];
    const active = isCurrent(pathname, link);
    return (
      <Link href={link.href} className={active ? "admin-sheet-link is-current" : "admin-sheet-link"} aria-current={active ? "page" : undefined}>
        <AdminIcon name={link.icon} />
        <span>{link.label}</span>
      </Link>
    );
  }
  return (
    <section className={open ? "admin-sheet-group is-open" : "admin-sheet-group"}>
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className={current ? "is-current" : undefined}>{label}</span>
        <SheetMark name="chevron" />
      </button>
      <div id={panelId} className="admin-sheet-links" hidden={!open}>
        {links.map((link) => {
          const active = isCurrent(pathname, link);
          return (
            <Link key={link.href} href={link.href} className={active ? "is-current" : undefined} aria-current={active ? "page" : undefined}>
              <AdminIcon name={link.icon} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function AdminSheet({ name, pathname }: { name: string; pathname: string }) {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHost(document.querySelector(".admin-app"));
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const root = panel.current;
    root?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
        return;
      }
      const items = root
        ? [...root.querySelectorAll<HTMLElement>("a, button")].filter((item) => !item.closest("[hidden]"))
        : [];
      if (event.key !== "Tab" || !items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const layer = (
    <div className={open ? "admin-sheet-layer is-open" : "admin-sheet-layer"} aria-hidden={!open}>
      <button className="admin-sheet-scrim" type="button" tabIndex={open ? 0 : -1} aria-label="إغلاق القائمة" onClick={() => setOpen(false)} />
      <div
        ref={panel}
        className="admin-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label="القائمة"
        tabIndex={-1}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <div className="admin-sheet-head">
          <button className="admin-sheet-back" type="button" aria-label="إغلاق القائمة" onClick={() => setOpen(false)}>
            <SheetMark name="back" />
          </button>
        </div>
        <div className="admin-sheet-scroll">
          {adminGroups.map((group) => (
            <SheetGroup
              key={group.id}
              label={group.label}
              links={group.links}
              pathname={pathname}
              open={Boolean(openGroups[group.id])}
              onToggle={() => setOpenGroups((value) => ({ ...value, [group.id]: !value[group.id] }))}
            />
          ))}
        </div>
        <div className="admin-sheet-dock">
          <p>{name}</p>
          <Link href="/">عرض المتجر</Link>
          <form action={logoutAction}>
            <button type="submit">خروج</button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={trigger}
        className="admin-sheet-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const current = adminGroups.find((group) => group.links.length > 1 && group.links.some((link) => isCurrent(pathname, link)));
          setOpenGroups(current ? { [current.id]: true } : {});
          setOpen(true);
        }}
      >
        القائمة
      </button>
      {host ? createPortal(layer, host) : null}
    </>
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

  return (
    <div className="admin-app">
      <FluidCanvas id="admin-fluid" className="admin-fluid" />
      <header className="admin-top">
        <div className="admin-top-inner">
          <Link className="admin-brand" href="/admin">
            Glossy
            <span>الإدارة</span>
          </Link>
          <AdminSheet name={name} pathname={pathname} />
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
