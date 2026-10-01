import { asc } from "drizzle-orm";
import { db } from "@/db";
import { brand, category } from "@/db/schema";
import { ProductForm } from "@/components/product-form";
import { getSettings } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "منتج جديد" };

export default async function NewProductPage() {
  await requireAdminPage();
  const [settings, categories, brands] = await Promise.all([
    getSettings(),
    db.select().from(category).orderBy(asc(category.sortOrder)),
    db.select().from(brand).orderBy(asc(brand.sortOrder)),
  ]);
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-extrabold">منتج جديد</h1>
      <ProductForm categories={categories} brands={brands} variants={[]} minorUnit={settings?.minorUnit ?? 100} />
    </div>
  );
}
