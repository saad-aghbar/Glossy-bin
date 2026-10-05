import Link from "next/link";
import { PlateImage } from "@/components/ui";
import { formatMinor } from "@/lib/money";

export function ProductCard({
  href,
  name,
  imageUrl,
  imageAlt,
  category,
  priceMinor,
  compareAtMinor,
  currency,
  minorUnit,
  inStock,
}: {
  href: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string;
  category?: string | null;
  priceMinor: number | null;
  compareAtMinor?: number | null;
  currency: string;
  minorUnit: number;
  inStock: boolean;
}) {
  return (
    <Link href={href} className="product-tile">
      <p className="product-kicker">{category}</p>
      <div className="product-photo">
        <PlateImage src={imageUrl} alt={imageAlt || name} bare className="product-photo-img" />
      </div>
      <div className="product-copy">
        <h2>{name}</h2>
        {priceMinor != null ? (
          <p className="price">
            {compareAtMinor != null && compareAtMinor > priceMinor ? (
              <s>{formatMinor(compareAtMinor, currency, minorUnit)}</s>
            ) : null}
            <span>{formatMinor(priceMinor, currency, minorUnit)}</span>
          </p>
        ) : null}
        {inStock ? null : <p className="product-stock">نفد</p>}
      </div>
    </Link>
  );
}
