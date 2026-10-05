import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ShopNav, type ShopGroup } from "@/components/shop-nav";
import { storeTagline } from "@/lib/brand";
import { isAdminRole } from "@/lib/access";
import type { getCurrentUser } from "@/lib/session";
import type { getSettings, listActiveCategories } from "@/server/queries";

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;
type Settings = Awaited<ReturnType<typeof getSettings>>;
type Categories = Awaited<ReturnType<typeof listActiveCategories>>;

export function SiteHeader({
  settings,
  user,
  cartCount,
  categories,
}: {
  settings: Settings;
  user: CurrentUser;
  cartCount: number;
  categories: Categories;
}) {
  const name = settings?.storeName || "Glossy";
  const shopping: ShopGroup = {
    id: "shop",
    label: "التسوق",
    links: [
      { href: "/products", label: "الكل", exact: true },
      ...categories.map((category) => ({ href: `/products?category=${category.slug}`, label: category.name })),
    ],
  };
  const help: ShopGroup = {
    id: "help",
    label: "مساعدة",
    links: [
      { href: "/contact", label: "تواصل" },
      { href: "/pages/delivery", label: "التوصيل" },
      { href: "/pages/privacy", label: "الخصوصية" },
      { href: "/pages/terms", label: "الشروط" },
    ],
  };
  const account: ShopGroup = {
    id: "account",
    label: user ? (isAdminRole(user.role) ? "حسابي" : "حسابي") : "حسابي",
    links: user
      ? [
          ...(isAdminRole(user.role) ? [{ href: "/admin", label: "الإدارة" }] : []),
          { href: "/account", label: "الحساب", exact: true },
          { href: "/account/orders", label: "الطلبات" },
          { href: "/account/addresses", label: "العناوين" },
        ]
      : [
          { href: "/account/login", label: "دخول" },
          { href: "/account/register", label: "إنشاء حساب" },
        ],
  };
  return (
    <header className="site-header">
      <div className="shell site-bar">
        <Link href="/" className="wordmark inline-flex items-center gap-2">
          {settings?.logoUrl ? (
            // The store name beside the mark is the accessible name.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="" className="h-8 w-auto object-contain" />
          ) : null}
          {name}
        </Link>
        <Suspense fallback={<div className="shop-menus" />}>
          <ShopNav
            shopping={shopping}
            help={help}
            account={account}
            cartHref="/cart"
            cartLabel={cartCount > 0 ? `الحقيبة (${cartCount})` : "الحقيبة"}
          />
        </Suspense>
      </div>
    </header>
  );
}

export function SiteFooter({ settings }: { settings: Settings }) {
  return (
    <footer className="site-footer">
      <div className="shell site-footer-grid">
        <nav className="grid gap-2 text-sm" aria-label="المساعدة">
          <p className="text-foreground">مساعدة</p>
          <Link href="/contact">تواصل</Link>
          <Link href="/pages/delivery">التوصيل والإرجاع</Link>
          <Link href="/pages/privacy">الخصوصية</Link>
          <Link href="/pages/terms">الشروط</Link>
        </nav>
        <div className="grid content-start gap-2 text-sm">
          <p className="text-foreground">{settings?.storeName || "Glossy"}</p>
          {storeTagline(settings?.tagline) ? <p className="quiet">{storeTagline(settings?.tagline)}</p> : null}
        </div>
        {settings?.instagramUrl || settings?.whatsappUrl || settings?.contactEmail || settings?.contactPhone ? (
          <div className="grid content-start gap-2 text-sm">
            <p className="text-foreground">تواصل</p>
            {settings.instagramUrl ? (
              <a href={settings.instagramUrl} target="_blank" rel="noreferrer">
                إنستغرام
              </a>
            ) : null}
            {settings.whatsappUrl ? (
              <a href={settings.whatsappUrl} target="_blank" rel="noreferrer">
                واتساب
              </a>
            ) : null}
            {settings.contactEmail ? <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a> : null}
            {settings.contactPhone ? <a href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a> : null}
          </div>
        ) : null}
      </div>
    </footer>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={className}>{children}</section>;
}
