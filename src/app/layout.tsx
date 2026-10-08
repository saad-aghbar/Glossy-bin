import type { Metadata, Viewport } from "next";
import { Readex_Pro } from "next/font/google";
import { connection } from "next/server";
import { FreshSafari } from "@/components/fresh-safari";
import { storeTagline } from "@/lib/brand";
import { getSettings } from "@/server/queries";
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
  return (
    <html lang="ar" dir="rtl" className={`${readex.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col antialiased">
        <FreshSafari />
        {children}
      </body>
    </html>
  );
}
