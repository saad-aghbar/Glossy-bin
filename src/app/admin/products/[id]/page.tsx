import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { brand, category, product, productImage, productVariant } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { Check } from "@/components/controls/check";
import { ChoiceList } from "@/components/controls/choice-list";
import { BoundForm } from "@/components/bound-form";
import { FileField } from "@/components/file-field";
import { ProductImages } from "@/components/admin/product-images";
import { ProductForm, draftsFromVariants } from "@/components/product-form";
import { setProductVisibilityAction, uploadImageAction } from "@/server/actions/catalog";
import { getSettings } from "@/server/queries";
import { one } from "@/lib/pagination";
import { requireAdminPage } from "@/lib/session";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const [settings, current, categories, brands, variants, images] = await Promise.all([
    getSettings(),
    db.query.product.findFirst({ where: eq(product.id, id) }),
    db.select().from(category).orderBy(asc(category.sortOrder)),
    db.select().from(brand).orderBy(asc(brand.sortOrder)),
    db.select().from(productVariant).where(eq(productVariant.productId, id)),
    db
      .select()
      .from(productImage)
      .where(eq(productImage.productId, id))
      .orderBy(asc(productImage.sortOrder), asc(productImage.createdAt)),
  ]);
  if (!current) notFound();
  const minorUnit = settings?.minorUnit ?? 100;
  const state = current.archivedAt ? "مؤرشف" : current.isPublished ? "منشور" : "مسودة";
  const error = one(query.error);
  return (
    <AdminPage title={current.name} description={`الحالة: ${state}. الصورة الأولى في الترتيب هي الصورة الرئيسية في المتجر.`}>
      {error === "confirm" ? <p className="alert">أكّدي الإجراء قبل المتابعة.</p> : null}
      {error === "state" ? <p className="alert">حالة غير صالحة.</p> : null}
      <div className="admin-actions">
        <form action={setProductVisibilityAction}>
          <input type="hidden" name="id" value={current.id} />
          <input type="hidden" name="visibility" value="draft" />
          <button className="btn btn-ghost" type="submit">
            حفظ كمسودة
          </button>
        </form>
        <form action={setProductVisibilityAction}>
          <input type="hidden" name="id" value={current.id} />
          <input type="hidden" name="visibility" value="published" />
          <button className="btn btn-primary" type="submit">
            نشر
          </button>
        </form>
        <form action={setProductVisibilityAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={current.id} />
          <input type="hidden" name="visibility" value="archived" />
          <Check name="confirmArchive" value="yes" required>أؤكد الأرشفة</Check>
          <button className="btn btn-ghost" type="submit">
            أرشفة
          </button>
        </form>
      </div>
      <ProductForm
        product={current}
        categories={categories}
        brands={brands}
        variants={draftsFromVariants(variants, minorUnit)}
        minorUnit={minorUnit}
      />
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">الصور</h2>
        <p className="admin-note">اسحبي الصورة لتغيير ترتيبها، أو استخدمي تقديم وتأخير. الأولى هي الصورة الرئيسية.</p>
        <ProductImages
          key={images.map((image) => `${image.id}:${image.sortOrder}`).join("|")}
          productId={current.id}
          productName={current.name}
          images={images.map((image) => {
            const owner = variants.find((variant) => variant.id === image.variantId);
            const named = owner ? [owner.shadeName, owner.sizeName].filter(Boolean).join(" / ") : "";
            return {
              id: image.id,
              url: image.url,
              alt: image.alt,
              variantLabel: named || (owner ? owner.sku : "لكل الخيارات"),
            };
          })}
        />
        <BoundForm action={uploadImageAction} submit="رفع الصورة" cancelHref="/admin/products">
          <input type="hidden" name="productId" value={current.id} />
          <input type="hidden" name="productName" value={current.name} />
          <label className="grid gap-1">
            وصف الصورة
            <input className="field" name="alt" />
          </label>
          <label className="grid gap-1">
            الخيار
            <ChoiceList name="variantId" defaultValue="" placeholder="لكل الخيارات" options={[{ value: "", label: "لكل الخيارات" }, ...variants.map((variant) => {
              const named = [variant.shadeName, variant.sizeName].filter(Boolean).join(" / ");
              return { value: variant.id, label: named || variant.sku };
            })]} />
          </label>
          <div className="grid gap-1">
            الملف
            <FileField name="image" accept="image/jpeg,image/png,image/webp" required />
          </div>
        </BoundForm>
      </section>
    </AdminPage>
  );
}
