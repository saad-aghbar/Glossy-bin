import Link from "next/link";
import { HomeExperience } from "@/components/home/home-motion";
import { heroCopy } from "@/components/home/scene-config";
import { ProductCard } from "@/components/product-card";
import { storeTagline } from "@/lib/brand";
import { listActiveCategories, listActiveOffers, listProducts, getSettings } from "@/server/queries";

function ProductRail({
  title,
  href,
  cards,
  currency,
  minorUnit,
}: {
  title: string;
  href: string;
  cards: Awaited<ReturnType<typeof listProducts>>["cards"];
  currency: string;
  minorUnit: number;
}) {
  if (cards.length === 0) return null;
  return (
    <section data-reveal>
      <div className="section-head">
        <h2>{title}</h2>
        <Link className="quiet-link" href={href}>
          الكل
        </Link>
      </div>
      <div className="rail">
        {cards.map((item) => (
          <ProductCard
            key={item.id}
            href={`/products/${item.slug}`}
            name={item.name}
            imageUrl={item.imageUrl}
            imageAlt={item.imageAlt}
            meta={item.categoryName}
            priceMinor={item.minPriceMinor}
            currency={currency}
            minorUnit={minorUnit}
            inStock={item.inStock}
          />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [settings, offers, categories, featured, newest] = await Promise.all([
    getSettings(),
    listActiveOffers(),
    listActiveCategories(),
    listProducts({ featuredOnly: true, publishedOnly: true, offset: 0, limit: 8 }),
    listProducts({ newest: true, publishedOnly: true, offset: 0, limit: 8 }),
  ]);
  const currency = settings?.currency ?? "SAR";
  const minorUnit = settings?.minorUnit ?? 100;
  const offer = offers[0];
  const tagline = storeTagline(settings?.tagline) || heroCopy.headingFallback;
  return (
    <HomeExperience storeName={settings?.storeName || "Glossy"} heading={tagline}>
      <div id="shop">
      {categories.length > 0 ? (
        <nav className="category-row" aria-label="التصنيفات">
          {categories.map((item) => (
            <Link key={item.id} href={`/products?category=${item.slug}`} data-reveal>
              {item.name}
            </Link>
          ))}
        </nav>
      ) : null}
      {offer ? (
        <Link className="campaign" href={offer.linkUrl || "/products"} data-reveal>
          <h2>{offer.title}</h2>
          {offer.description ? <p className="quiet max-w-xl">{offer.description}</p> : null}
          <span className="text-link">شاهدي</span>
        </Link>
      ) : null}
      <ProductRail
        title="مختارات"
        href="/products?featured=1"
        cards={featured.cards}
        currency={currency}
        minorUnit={minorUnit}
      />
      <ProductRail
        title="وصل حديثاً"
        href="/products?sort=new"
        cards={newest.cards}
        currency={currency}
        minorUnit={minorUnit}
      />
      </div>
    </HomeExperience>
  );
}
