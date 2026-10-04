import { SiteFooter, SiteHeader } from "@/components/site";
import { TrackingConsent } from "@/components/tracking";
import { isAdminRole } from "@/lib/access";
import { cartCount } from "@/lib/cart";
import { configuredPixelId } from "@/lib/tracking";
import { getCurrentUser } from "@/lib/session";
import { getSettings, listActiveCategories } from "@/server/queries";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, user, count, categories] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    cartCount(),
    listActiveCategories(),
  ]);
  return (
    <>
      <SiteHeader settings={settings} user={user} cartCount={count} categories={categories} />
      <main className="shell flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <TrackingConsent isAdmin={isAdminRole(user?.role)} pixelId={configuredPixelId(process.env.META_PIXEL_ID)} />
    </>
  );
}
