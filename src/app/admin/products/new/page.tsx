import { asc } from "drizzle-orm";
import { db } from "@/db";
import { brand, category } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
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
    <AdminPage title="منتج جديد" description="احفظي المنتج أولًا، ثم أضيفي الصور من صفحة التعديل. الصورة الأولى تصبح الصورة الرئيسية." width="narrow">
      <ProductForm categories={categories} brands={brands} variants={[]} minorUnit={settings?.minorUnit ?? 100} />
    </AdminPage>
  );
}
