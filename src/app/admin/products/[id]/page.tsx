import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { brand, category, product, productImage, productVariant } from "@/db/schema";
import { BoundForm } from "@/components/bound-form";
import { ConfirmForm } from "@/components/confirm-form";
import { FileField } from "@/components/file-field";
import { PendingButton, PlateImage } from "@/components/ui";
import { ProductForm, draftsFromVariants } from "@/components/product-form";
import { chooseMainImageAction, deleteImageAction, moveImageAction, setProductVisibilityAction, uploadImageAction } from "@/server/actions/catalog";
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
    <div className="grid gap-6">
      <h1 className="text-3xl font-extrabold">{current.name}</h1>
      <p className="text-sm text-muted">الحالة: {state}</p>
      {error === "confirm" ? <p className="alert">أكّدي الإجراء قبل المتابعة.</p> : null}
      {error === "state" ? <p className="alert">حالة غير صالحة.</p> : null}
      <div className="flex flex-wrap items-end gap-4">
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
          <label className="flex items-center gap-2 text-sm">
            <input name="confirmArchive" type="checkbox" value="yes" required />
            أؤكد الأرشفة
          </label>
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((image, index) => (
            <figure key={image.id} className="card grid gap-2 overflow-hidden p-2">
              <PlateImage src={image.url} alt={image.alt || current.name} className="aspect-square w-full object-cover" />
              <p className="text-sm text-muted">{index === 0 ? "الصورة الرئيسية" : image.alt}</p>
              <div className="flex flex-wrap gap-2">
                {index === 0 ? null : (
                  <form action={chooseMainImageAction}>
                    <input type="hidden" name="id" value={image.id} />
                    <button className="btn btn-ghost" type="submit">
                      صورة رئيسية
                    </button>
                  </form>
                )}
                {index === 0 ? null : (
                  <form action={moveImageAction}>
                    <input type="hidden" name="id" value={image.id} />
                    <input type="hidden" name="direction" value="earlier" />
                    <button className="btn btn-ghost" type="submit">
                      تقديم
                    </button>
                  </form>
                )}
                {index === images.length - 1 ? null : (
                  <form action={moveImageAction}>
                    <input type="hidden" name="id" value={image.id} />
                    <input type="hidden" name="direction" value="later" />
                    <button className="btn btn-ghost" type="submit">
                      تأخير
                    </button>
                  </form>
                )}
              </div>
              <ConfirmForm action={deleteImageAction} message="حذف هذه الصورة؟">
                <input type="hidden" name="id" value={image.id} />
                <input type="hidden" name="confirmDelete" value="yes" />
                <PendingButton>حذف</PendingButton>
              </ConfirmForm>
            </figure>
          ))}
        </div>
        <BoundForm action={uploadImageAction} submit="رفع الصورة" cancelHref="/admin/products">
          <input type="hidden" name="productId" value={current.id} />
          <input type="hidden" name="productName" value={current.name} />
          <label className="grid gap-1">
            وصف الصورة
            <input className="field" name="alt" />
          </label>
          <label className="grid gap-1">
            الخيار
            <select className="select" name="variantId" defaultValue="">
              <option value="">لكل الخيارات</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.sku}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-1">
            الملف
            <FileField name="image" accept="image/jpeg,image/png,image/webp" required />
          </div>
        </BoundForm>
      </section>
    </div>
  );
}
