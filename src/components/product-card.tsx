import Link from "next/link";
import { PlateImage } from "@/components/ui";
import { formatMinor } from "@/lib/money";

export function ProductCard({
  href,
  name,
  imageUrl,
  imageAlt,
  meta,
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
  meta?: string | null;
  priceMinor: number | null;
  compareAtMinor?: number | null;
  currency: string;
  minorUnit: number;
  inStock: boolean;
}) {
  return (
    <Link href={href} className="product-tile">
      <PlateImage src={imageUrl} alt={imageAlt || name} />
      <h2>{name}</h2>
      {meta ? <p className="quiet">{meta}</p> : null}
      {priceMinor != null ? (
        <p className="price">
          {compareAtMinor && compareAtMinor > priceMinor ? (
            <s>{formatMinor(compareAtMinor, currency, minorUnit)}</s>
          ) : null}
          <span>{formatMinor(priceMinor, currency, minorUnit)}</span>
        </p>
      ) : null}
      <p className="quiet">{inStock ? "متوفر" : "نفد"}</p>
    </Link>
  );
}
