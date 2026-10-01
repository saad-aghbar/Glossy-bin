import Link from "next/link";
import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { brand, category, product, productVariant } from "@/db/schema";
import { ConfirmForm } from "@/components/confirm-form";
import { Pagination } from "@/components/pagination";
import { PendingButton } from "@/components/ui";
import { deleteProductAction } from "@/server/actions/catalog";
import { one, pageCount, parsePagination } from "@/lib/pagination";
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
  const [categories, brands] = await Promise.all([
    db.select().from(category).orderBy(desc(category.name)),
    db.select().from(brand).orderBy(desc(brand.name)),
  ]);
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
  const notice =
    one(params.error) === "sold"
      ? "لا يمكن حذف منتج مرتبط بطلب. أرشفِه بدل ذلك."
      : one(params.error) === "confirm"
        ? "أكّدي الحذف قبل المتابعة."
        : "";
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">المنتجات</h1>
        <Link className="btn btn-primary" href="/admin/products/new">
          منتج جديد
        </Link>
      </div>
      {notice ? <p className="alert">{notice}</p> : null}
      <form className="filter-bar grid min-w-0 gap-3 md:grid-cols-3" method="get">
        <label className="grid min-w-0 gap-1 md:col-span-3">
          بحث
          <input className="field" name="q" defaultValue={q} />
        </label>
        <label className="grid min-w-0 gap-1">
          التصنيف
          <select className="select" name="category" defaultValue={categoryId}>
            <option value="">كل التصنيفات</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1">
          العلامة
          <select className="select" name="brand" defaultValue={brandId}>
            <option value="">كل العلامات</option>
            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1">
          النشر
          <select className="select" name="status" defaultValue={status}>
            <option value="">كل الحالات</option>
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
            <option value="archived">مؤرشف</option>
          </select>
        </label>
        <label className="grid min-w-0 gap-1">
          المخزون
          <select className="select" name="stock" defaultValue={stock}>
            <option value="">الكل</option>
            <option value="in">متوفر</option>
            <option value="out">نفد</option>
          </select>
        </label>
        <div className="filter-actions">
          <button className="btn btn-primary" type="submit">
            تصفية
          </button>
        </div>
      </form>
      <div className="list-cards grid gap-2">
        {rows.map((row) => (
          <article key={row.id} className="card grid gap-2 p-3">
            <Link className="break-words font-bold" href={`/admin/products/${row.id}`}>
              {row.name}
            </Link>
            <p className="text-sm text-muted">{publicationLabel(row)}</p>
            <p className="text-sm text-muted">{[row.brandName, row.categoryName].filter(Boolean).join(" · ")}</p>
            <ConfirmForm action={deleteProductAction} message="حذف هذا المنتج؟">
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="confirmDelete" value="yes" />
              <PendingButton>حذف</PendingButton>
            </ConfirmForm>
          </article>
        ))}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>المنتج</th>
            <th>الحالة</th>
            <th>التفاصيل</th>
            <th>إجراء</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link className="break-words font-bold" href={`/admin/products/${row.id}`}>
                  {row.name}
                </Link>
              </td>
              <td>{publicationLabel(row)}</td>
              <td>{[row.brandName, row.categoryName].filter(Boolean).join(" · ")}</td>
              <td>
                <ConfirmForm action={deleteProductAction} message="حذف هذا المنتج؟">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="confirmDelete" value="yes" />
                  <PendingButton>حذف</PendingButton>
                </ConfirmForm>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={pagination.page} pages={pageCount(total ?? 0, pagination.pageSize)} path="/admin/products" params={preserved} />
    </div>
  );
}
