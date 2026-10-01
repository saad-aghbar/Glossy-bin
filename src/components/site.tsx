import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNav } from "@/components/mobile-nav";
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
  const accountHref = user ? (isAdminRole(user.role) ? "/admin" : "/account") : "/account/login";
  const accountLabel = user ? (isAdminRole(user.role) ? "الإدارة" : "حسابي") : "دخول";
  return (
    <header className="site-header">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-4">
        <Link href="/" className="wordmark inline-flex items-center gap-2">
          {settings?.logoUrl ? (
            // The store name beside the mark is the accessible name.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="" className="h-8 w-auto object-contain" />
          ) : null}
          {name}
        </Link>
        <nav className="nav-links" aria-label="التنقل الرئيسي">
          <Link href="/products">الكل</Link>
          {categories.map((category) => (
            <Link key={category.id} href={`/products?category=${category.slug}`}>
              {category.name}
            </Link>
          ))}
        </nav>
        <div className="utility">
          <Link href="/cart">الحقيبة{cartCount > 0 ? ` (${cartCount})` : ""}</Link>
          <Link href={accountHref}>{accountLabel}</Link>
        </div>
        <MobileNav>
          <Link href="/products">الكل</Link>
          {categories.map((category) => (
            <Link key={category.id} href={`/products?category=${category.slug}`}>
              {category.name}
            </Link>
          ))}
          <Link href="/contact">تواصل</Link>
        </MobileNav>
      </div>
    </header>
  );
}

export function SiteFooter({ settings }: { settings: Settings }) {
  return (
    <footer className="site-footer">
      <div className="shell grid gap-8 py-10 md:grid-cols-3">
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
