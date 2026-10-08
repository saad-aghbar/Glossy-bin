"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { usePinnedPopover } from "@/components/controls/use-pinned-popover";
import { createPortal } from "react-dom";

export type ShopLink = { href: string; label: string; exact?: boolean };

export type ShopGroup = { id: string; label: string; links: ShopLink[] };

function isCurrent(pathname: string, search: string, link: ShopLink) {
  const [path, query = ""] = link.href.split("?");
  if (path !== pathname) {
    return Boolean(!query && !link.exact && path !== "/" && pathname.startsWith(`${path}/`));
  }
  if (query) return search.includes(query);
  if (path === "/products") return !search.includes("category=") && !search.includes("brand=");
  return true;
}

function ShopMenu({
  group,
  pathname,
  search,
  open,
  onOpen,
  onClose,
}: {
  group: ShopGroup;
  pathname: string;
  search: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const item = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const fine = useRef(false);
  const current = group.links.some((link) => isCurrent(pathname, search, link));
  usePinnedPopover(open, item);

  function showMenu() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    onOpen();
  }

  function hideMenuSoon() {
    if (!fine.current) return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => onClose(), 180);
  }

  useEffect(() => {
    fine.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        item.current?.querySelector("button")?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!item.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose, open]);

  return (
    <div
      ref={item}
      className={open ? "shop-nav-item is-open" : "shop-nav-item"}
      onMouseEnter={() => {
        if (fine.current) showMenu();
      }}
      onMouseLeave={hideMenuSoon}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onClose();
      }}
    >
      <button
        className={current ? "shop-nav-trigger is-current" : "shop-nav-trigger"}
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (open) onClose();
          else onOpen();
        }}
      >
        {group.label}
        <span className="shop-caret" aria-hidden="true" />
      </button>
      <div className="shop-drop">
        <div className="shop-drop-panel">
          {group.links.map((link) => {
            const active = isCurrent(pathname, search, link);
            return (
              <Link key={link.href} href={link.href} className={active ? "shop-link is-current" : "shop-link"} aria-current={active ? "page" : undefined}>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DrawerIcon({ name }: { name: "back" | "bag" | "person" | "chevron" }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg className={name === "back" ? "shop-drawer-icon is-back" : "shop-drawer-icon"} viewBox="0 0 24 24" aria-hidden="true">
      {name === "back" ? <path {...stroke} d="M14.5 6.5 8 12l6.5 5.5" /> : null}
      {name === "chevron" ? <path {...stroke} d="m7 10 5 5 5-5" /> : null}
      {name === "bag" ? (
        <>
          <path {...stroke} d="M7.2 10.2 8.4 19h7.2l1.2-8.8z" />
          <path {...stroke} d="M9 10V7.6M15 10V7.6" />
        </>
      ) : null}
      {name === "person" ? <path {...stroke} d="M12 12.2a3.2 3.2 0 1 0-3.2-3.2A3.2 3.2 0 0 0 12 12.2ZM6.4 19.2a5.6 5.6 0 0 1 11.2 0" /> : null}
    </svg>
  );
}

function DrawerGroup({
  group,
  pathname,
  search,
  open,
  onToggle,
  icon,
}: {
  group: ShopGroup;
  pathname: string;
  search: string;
  open: boolean;
  onToggle: () => void;
  icon?: "person";
}) {
  const panelId = useId();
  const current = group.links.some((link) => isCurrent(pathname, search, link));
  return (
    <section className={open ? "shop-drawer-group is-open" : "shop-drawer-group"}>
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        {icon ? <DrawerIcon name={icon} /> : null}
        <span className={current ? "is-current" : undefined}>{group.label}</span>
        <DrawerIcon name="chevron" />
      </button>
      <div id={panelId} className="shop-drawer-links" hidden={!open}>
        {group.links.map((link) => {
          const active = isCurrent(pathname, search, link);
          return (
            <Link key={link.href} href={link.href} className={active ? "is-current" : undefined} aria-current={active ? "page" : undefined}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Drawer({
  shopping,
  help,
  account,
  cartHref,
  cartLabel,
  pathname,
  search,
}: {
  shopping: ShopGroup;
  help: ShopGroup;
  account: ShopGroup;
  cartHref: string;
  cartLabel: string;
  pathname: string;
  search: string;
}) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const root = document.querySelector(".shop-app");
    setHost(root instanceof HTMLElement ? root : null);
  }, []);

  function revealCurrent() {
    const current = [shopping, help, account].find((group) => group.links.some((link) => isCurrent(pathname, search, link)));
    setOpenGroups(current ? { [current.id]: true } : {});
  }

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
    <div className={open ? "shop-drawer-layer is-open" : "shop-drawer-layer"} aria-hidden={!open}>
      <button className="shop-drawer-scrim" type="button" tabIndex={open ? 0 : -1} aria-label="إغلاق القائمة" onClick={() => setOpen(false)} />
      <div
        ref={panel}
        className="shop-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="القائمة"
        tabIndex={-1}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <div className="shop-drawer-head">
          <button className="shop-drawer-back" type="button" aria-label="إغلاق القائمة" onClick={() => setOpen(false)}>
            <DrawerIcon name="back" />
          </button>
        </div>
        <div className="shop-drawer-scroll">
          {[shopping, help].map((group) => (
            <DrawerGroup
              key={group.id}
              group={group}
              pathname={pathname}
              search={search}
              open={Boolean(openGroups[group.id])}
              onToggle={() => setOpenGroups((value) => ({ ...value, [group.id]: !value[group.id] }))}
            />
          ))}
        </div>
        <div className="shop-drawer-dock">
          <Link href={cartHref} className="shop-drawer-dock-link">
            <DrawerIcon name="bag" />
            <span>{cartLabel}</span>
          </Link>
          <DrawerGroup
            group={account}
            pathname={pathname}
            search={search}
            icon="person"
            open={Boolean(openGroups[account.id])}
            onToggle={() => setOpenGroups((value) => ({ ...value, [account.id]: !value[account.id] }))}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="shop-drawer">
      <button
        ref={trigger}
        className="shop-drawer-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          revealCurrent();
          setOpen(true);
        }}
      >
        القائمة
      </button>
      {host ? createPortal(layer, host) : null}
    </div>
  );
}

export function ShopNav({
  shopping,
  help,
  account,
  cartHref,
  cartLabel,
}: {
  shopping: ShopGroup;
  help: ShopGroup;
  account: ShopGroup;
  cartHref: string;
  cartLabel: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setSearch(searchParams.toString());
  }, [searchParams]);

  useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  const openIdRef = useRef(openId);
  openIdRef.current = openId;

  useEffect(() => {
    const header = document.querySelector(".site-header");
    if (!(header instanceof HTMLElement)) return;
    const measure = () => {
      document.documentElement.style.setProperty("--shop-bar", `${header.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return () => observer.disconnect();

    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last;
      last = y;
      const menuOpen = Boolean(openIdRef.current) || document.body.style.overflow === "hidden";
      if (y <= 0 || menuOpen || delta < 0) {
        header.classList.remove("is-away");
        return;
      }
      if (delta > 0) header.classList.add("is-away");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      header.classList.remove("is-away");
    };
  }, []);

  return (
    <>
      <nav className="shop-menus" aria-label="التنقل الرئيسي">
        {[shopping, help].map((group) => (
          <ShopMenu
            key={group.id}
            group={group}
            pathname={pathname}
            search={search}
            open={openId === group.id}
            onOpen={() => setOpenId(group.id)}
            onClose={() => setOpenId((value) => (value === group.id ? null : value))}
          />
        ))}
      </nav>
      <div className="shop-tools">
        <Link href={cartHref} className="shop-bag">
          {cartLabel}
        </Link>
        <ShopMenu
          group={account}
          pathname={pathname}
          search={search}
          open={openId === account.id}
          onOpen={() => setOpenId(account.id)}
          onClose={() => setOpenId((value) => (value === account.id ? null : value))}
        />
      </div>
      <Drawer
        shopping={shopping}
        help={help}
        account={account}
        cartHref={cartHref}
        cartLabel={cartLabel}
        pathname={pathname}
        search={search}
      />
    </>
  );
}
