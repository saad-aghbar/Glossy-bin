import Link from "next/link";
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { brand, category, product, productImage, productVariant } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { ChoiceList } from "@/components/controls/choice-list";
import { ConfirmForm } from "@/components/confirm-form";
import { Pagination } from "@/components/pagination";
import { PendingButton, PlateImage } from "@/components/ui";
import { deleteProductAction } from "@/server/actions/catalog";
import { formatMinor } from "@/lib/money";
import { one, pageCount, parsePagination } from "@/lib/pagination";
import { getSettings } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "المنتجات" };

function publicationLabel(row: { isPublished: boolean; archivedAt: Date | null }) {
  if (row.archivedAt) return "مؤرشف";
  if (row.isPublished) return "منشور";
  return "مسودة";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const pagination = parsePagination(params, 20);
  const q = one(params.q).trim();
  const categoryId = one(params.category).trim();
  const brandId = one(params.brand).trim();
  const status = one(params.status).trim();
  const stock = one(params.stock).trim();
  const [settings, categories, brands] = await Promise.all([
    getSettings(),
    db.select().from(category).orderBy(desc(category.name)),
    db.select().from(brand).orderBy(desc(brand.name)),
  ]);
  const currency = settings?.currency ?? "SAR";
  const minorUnit = settings?.minorUnit ?? 100;
  const filters = [];
  if (q) {
    const term = `%${q.replace(/[%_\\]/g, "")}%`;
    filters.push(or(ilike(product.name, term), ilike(product.slug, term)));
  }
  if (categoryId) filters.push(eq(product.categoryId, categoryId));
  if (brandId) filters.push(eq(product.brandId, brandId));
  if (status === "draft") filters.push(and(eq(product.isPublished, false), isNull(product.archivedAt)));
  if (status === "published") filters.push(and(eq(product.isPublished, true), isNull(product.archivedAt)));
  if (status === "archived") filters.push(isNotNull(product.archivedAt));
  const inStock = sql`exists (select 1 from ${productVariant} where ${productVariant.productId} = ${product.id} and ${productVariant.isActive} = true and ${productVariant.stockQty} > 0)`;
  if (stock === "in") filters.push(inStock);
  if (stock === "out") {
    filters.push(
      sql`not exists (select 1 from ${productVariant} where ${productVariant.productId} = ${product.id} and ${productVariant.isActive} = true and ${productVariant.stockQty} > 0)`,
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  const rows = await db
    .select({
      id: product.id,
      name: product.name,
      isPublished: product.isPublished,
      archivedAt: product.archivedAt,
      categoryName: category.name,
      brandName: brand.name,
    })
    .from(product)
    .leftJoin(category, eq(category.id, product.categoryId))
    .leftJoin(brand, eq(brand.id, product.brandId))
    .where(where)
    .orderBy(desc(product.createdAt))
    .limit(pagination.pageSize)
    .offset(pagination.offset);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(product)
    .where(where);
  const preserved = {
    ...(q ? { q } : {}),
    ...(categoryId ? { category: categoryId } : {}),
    ...(brandId ? { brand: brandId } : {}),
    ...(status ? { status } : {}),
    ...(stock ? { stock } : {}),
  };
  const ids = rows.map((row) => row.id);
  const [variants, images] = await Promise.all([
    ids.length ? db.select().from(productVariant).where(inArray(productVariant.productId, ids)) : [],
    ids.length
      ? db.select().from(productImage).where(inArray(productImage.productId, ids)).orderBy(asc(productImage.sortOrder))
      : [],
  ]);
  const catalog = rows.map((row) => {
    const ownVariants = variants.filter((item) => item.productId === row.id && item.isActive);
    const prices = ownVariants.map((item) => item.priceMinor);
    const image = images.find((item) => item.productId === row.id);
    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;
    return {
      ...row,
      imageUrl: image?.url ?? null,
      variantCount: ownVariants.length,
      stock: ownVariants.reduce((sum, item) => sum + item.stockQty, 0),
      price:
        min == null || max == null
          ? "—"
          : min === max
            ? formatMinor(min, currency, minorUnit)
            : `${formatMinor(min, currency, minorUnit)} – ${formatMinor(max, currency, minorUnit)}`,
    };
  });
  const notice =
    one(params.error) === "sold"
      ? "لا يمكن حذف منتج مرتبط بطلب. أرشفِه بدل ذلك."
      : one(params.error) === "confirm"
        ? "أكّدي الحذف قبل المتابعة."
        : "";
  return (
    <AdminPage
      title="المنتجات"
      description="كتالوج المتجر مع الصورة الرئيسية والسعر والمخزون. الحذف يبقى إجراءً ثانويًا لأن الأرشفة أنسب للمنتجات المباعة."
      action={<Link className="btn btn-primary" href="/admin/products/new">منتج جديد</Link>}
    >
      {notice ? <p className="alert">{notice}</p> : null}
      <div className="admin-chips">
        {[
          ["", "الكل"],
          ["published", "منشور"],
          ["draft", "مسودة"],
          ["archived", "مؤرشف"],
        ].map(([value, label]) => {
          const params = new URLSearchParams(preserved);
          if (value) params.set("status", value);
          else params.delete("status");
          const href = params.size ? `/admin/products?${params}` : "/admin/products";
          const current = status === value;
          return (
            <Link key={value || "all"} href={href} className={current ? "is-current" : undefined}>
              {label}
            </Link>
          );
        })}
      </div>
      {(q || categoryId || brandId || stock) ? (
        <p className="admin-note">
          التصفية النشطة:
          {q ? ` بحث «${q}»` : ""}
          {categoryId ? ` · ${categories.find((item) => item.id === categoryId)?.name ?? "تصنيف"}` : ""}
          {brandId ? ` · ${brands.find((item) => item.id === brandId)?.name ?? "علامة"}` : ""}
          {stock === "in" ? " · متوفر" : stock === "out" ? " · نفد" : ""}
          {" "}
          <Link href="/admin/products">مسح</Link>
        </p>
      ) : null}
      <form className="filter-bar grid min-w-0 gap-3 md:grid-cols-3" method="get">
        <label className="grid min-w-0 gap-1 md:col-span-3">
          بحث
          <input className="field" name="q" defaultValue={q} />
        </label>
        <label className="grid min-w-0 gap-1">
          التصنيف
          <ChoiceList name="category" defaultValue={categoryId} placeholder="كل التصنيفات" options={[{ value: "", label: "كل التصنيفات" }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
        </label>
        <label className="grid min-w-0 gap-1">
          العلامة
          <ChoiceList name="brand" defaultValue={brandId} placeholder="كل العلامات" options={[{ value: "", label: "كل العلامات" }, ...brands.map((item) => ({ value: item.id, label: item.name }))]} />
        </label>
        <label className="grid min-w-0 gap-1">
          النشر
          <ChoiceList name="status" defaultValue={status} placeholder="كل الحالات" options={[{ value: "", label: "كل الحالات" }, { value: "draft", label: "مسودة" }, { value: "published", label: "منشور" }, { value: "archived", label: "مؤرشف" }]} />
        </label>
        <label className="grid min-w-0 gap-1">
          المخزون
          <ChoiceList name="stock" defaultValue={stock} placeholder="الكل" options={[{ value: "", label: "الكل" }, { value: "in", label: "متوفر" }, { value: "out", label: "نفد" }]} />
        </label>
        <div className="filter-actions">
          <button className="btn btn-primary" type="submit">
            تصفية
          </button>
        </div>
      </form>
      {catalog.length === 0 ? <p className="admin-surface p-4">لا توجد منتجات مطابقة.</p> : null}
      <div className="grid gap-2 md:hidden">
        {catalog.map((row) => (
          <article key={row.id} className="admin-surface flex gap-3 p-3">
            <PlateImage src={row.imageUrl} alt="" sizes="4rem" className="plate h-16 w-16 object-cover" />
            <div className="min-w-0">
              <Link className="font-medium" href={`/admin/products/${row.id}`}>{row.name}</Link>
              <p className="admin-note">{publicationLabel(row)} · {row.price} · المخزون {row.stock}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="admin-surface hidden overflow-auto md:block">
        <table className="data-table" style={{ display: "table" }}>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>التصنيف</th>
              <th>الحالة</th>
              <th>الخيارات</th>
              <th>السعر</th>
              <th>المخزون</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link className="flex items-center gap-2" href={`/admin/products/${row.id}`}>
                    <PlateImage src={row.imageUrl} alt="" sizes="3rem" className="plate h-12 w-12 object-cover" />
                    <span>{row.name}</span>
                  </Link>
                </td>
                <td>{[row.brandName, row.categoryName].filter(Boolean).join(" · ") || "—"}</td>
                <td>{publicationLabel(row)}</td>
                <td>{row.variantCount}</td>
                <td>{row.price}</td>
                <td>{row.stock}</td>
                <td>
                  <Link href={`/admin/products/${row.id}`}>تعديل</Link>
                  <ConfirmForm action={deleteProductAction} message={`حذف «${row.name}»؟ لن يُحذف إن كان مرتبطًا بطلب.`}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="confirmDelete" value="yes" />
                    <PendingButton>حذف</PendingButton>
                  </ConfirmForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={pagination.page} pages={pageCount(total ?? 0, pagination.pageSize)} path="/admin/products" params={preserved} />
    </AdminPage>
  );
}
