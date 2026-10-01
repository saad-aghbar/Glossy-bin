import type { Metadata, Viewport } from "next";
import { Readex_Pro } from "next/font/google";
import { connection } from "next/server";
import { SiteFooter, SiteHeader } from "@/components/site";
import { TrackingConsent } from "@/components/tracking";
import { isAdminRole } from "@/lib/access";
import { storeTagline } from "@/lib/brand";
import { cartCount } from "@/lib/cart";
import { configuredPixelId } from "@/lib/tracking";
import { getCurrentUser } from "@/lib/session";
import { getSettings, listActiveCategories } from "@/server/queries";
import "./globals.css";

const readex = Readex_Pro({
  subsets: ["arabic", "latin"],
  variable: "--font-readex",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = settings?.storeName || "Glossy";
  return {
    title: {
      default: name,
      template: `%s | ${name}`,
    },
    description: storeTagline(settings?.tagline) || name,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f1ea",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [settings, user, count, categories] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    cartCount(),
    listActiveCategories(),
  ]);
  return (
    <html lang="ar" dir="rtl" className={`${readex.variable} h-full`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <SiteHeader settings={settings} user={user} cartCount={count} categories={categories} />
        <main className="shell flex-1">{children}</main>
        <SiteFooter settings={settings} />
        <TrackingConsent isAdmin={isAdminRole(user?.role)} pixelId={configuredPixelId(process.env.META_PIXEL_ID)} />
      </body>
    </html>
  );
}
