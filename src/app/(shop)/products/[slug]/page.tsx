import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductPurchase } from "@/components/product-purchase";
import { one } from "@/lib/pagination";
import { getProductBySlug, getSettings, listProducts } from "@/server/queries";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.name ?? "منتج" };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product) notFound();
  const related = product.category
    ? await listProducts({
        categorySlug: product.category.slug,
        publishedOnly: true,
        offset: 0,
        limit: 4,
      })
    : { cards: [] };
  const others = related.cards.filter((item) => item.slug !== product.slug).slice(0, 3);
  const from = one(query.from);
  const back = from.startsWith("/products") && !from.startsWith("//") && !from.includes("://") ? from : "/products";
  return (
    <div className="grid gap-8">
      <Link className="quiet-link w-fit" href={back}>
        العودة للنتائج
      </Link>
      <ProductPurchase
        name={product.name}
        description={product.description}
        eyebrow={[product.brand?.name, product.category?.name].filter(Boolean).join(" · ")}
        variants={product.variants}
        images={product.images}
        currency={settings?.currency ?? "SAR"}
        minorUnit={settings?.minorUnit ?? 100}
      />
      {others.length > 0 ? (
        <section className="grid gap-4">
          <h2>منتجات مشابهة</h2>
          <div className="product-grid">
            {others.map((item) => (
              <ProductCard
                key={item.id}
                href={`/products/${item.slug}`}
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
        </section>
      ) : null}
    </div>
  );
}
