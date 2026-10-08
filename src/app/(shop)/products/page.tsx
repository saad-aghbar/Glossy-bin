import Link from "next/link";
import { ChoiceList } from "@/components/controls/choice-list";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import { one, pageCount, parsePagination } from "@/lib/pagination";
import { getSettings, listActiveBrands, listActiveCategories, listProducts } from "@/server/queries";

export const metadata = { title: "التسوق" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pagination = parsePagination(params, 24);
  const q = one(params.q).trim();
  const categorySlug = one(params.category).trim();
  const brandSlug = one(params.brand).trim();
  const featuredOnly = one(params.featured) === "1";
  const newest = one(params.sort) === "new";
  const [settings, categories, brands, result] = await Promise.all([
    getSettings(),
    listActiveCategories(),
    listActiveBrands(),
    listProducts({
      q,
      categorySlug,
      brandSlug,
      featuredOnly,
      newest,
      publishedOnly: true,
      offset: pagination.offset,
      limit: pagination.pageSize,
    }),
  ]);
  const pages = pageCount(result.total, pagination.pageSize);
  const filtered = Boolean(q || categorySlug || brandSlug || featuredOnly || newest);
  const preserved = {
    ...(q ? { q } : {}),
    ...(categorySlug ? { category: categorySlug } : {}),
    ...(brandSlug ? { brand: brandSlug } : {}),
    ...(featuredOnly ? { featured: "1" } : {}),
    ...(newest ? { sort: "new" } : {}),
    pageSize: String(pagination.pageSize),
  };
  const from = `/products?${new URLSearchParams(preserved).toString()}`;
  return (
    <div className="grid gap-8 py-8">
      <header className="grid gap-2">
        <h1 className="m-0 text-4xl font-normal">التسوق</h1>
        <p className="quiet">{result.total} منتج</p>
      </header>
      <form className="card grid min-w-0 gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end" method="get">
        <label className="grid min-w-0 gap-1 md:col-span-2">
          البحث
          <input className="field" name="q" defaultValue={q} placeholder="اسم المنتج" />
        </label>
        <label className="grid min-w-0 gap-1">
          التصنيف
          <ChoiceList name="category" defaultValue={categorySlug} placeholder="كل التصنيفات" options={[{ value: "", label: "كل التصنيفات" }, ...categories.map((item) => ({ value: item.slug, label: item.name }))]} />
        </label>
        <label className="grid min-w-0 gap-1">
          العلامة
          <ChoiceList name="brand" defaultValue={brandSlug} placeholder="كل العلامات" options={[{ value: "", label: "كل العلامات" }, ...brands.map((item) => ({ value: item.slug, label: item.name }))]} />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn btn-primary" type="submit">
            تصفية
          </button>
          {filtered ? (
            <Link className="quiet-link" href="/products">
              مسح التصفية
            </Link>
          ) : null}
        </div>
      </form>
      {result.cards.length === 0 ? (
        <p className="card shop-empty">
          لا توجد منتجات مطابقة. <Link href="/products">العودة إلى الكل</Link>
        </p>
      ) : (
        <div className="product-grid">
          {result.cards.map((item) => (
            <ProductCard
              key={item.id}
              slug={item.slug}
              href={`/products/${item.slug}?from=${encodeURIComponent(from)}`}
              name={item.name}
              imageUrl={item.imageUrl}
              imageAlt={item.imageAlt}
              category={item.categoryName}
              priceMinor={item.minPriceMinor}
              compareAtMinor={item.compareAtMinor}
              currency={settings?.currency ?? "SAR"}
              minorUnit={settings?.minorUnit ?? 100}
              inStock={item.inStock}
            />
          ))}
        </div>
      )}
      <Pagination page={pagination.page} pages={pages} path="/products" params={preserved} />
    </div>
  );
}
