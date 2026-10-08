import Link from "next/link";
import { PlateImage } from "@/components/ui";

type Tile = {
  slot: number;
  imageUrl: string;
  targetKind: string;
  targetValue: string;
};

function collageHref(tile: Tile) {
  if (tile.targetKind === "brand") return `/products?brand=${encodeURIComponent(tile.targetValue)}`;
  if (tile.targetKind === "category") return `/products?category=${encodeURIComponent(tile.targetValue)}`;
  return tile.targetValue.startsWith("/") && !tile.targetValue.startsWith("//") ? tile.targetValue : "/products";
}

export function BrandCollage({ tiles }: { tiles: Tile[] }) {
  if (tiles.length !== 7) return null;
  return (
    <section className="card brand-collage" aria-label="كولاج العلامات">
      {tiles.map((tile) => (
        <Link key={tile.slot} prefetch={false} className={tile.slot % 3 === 0 ? "is-full" : "is-half"} href={collageHref(tile)}>
          <PlateImage src={tile.imageUrl} alt="" bare sizes={tile.slot % 3 === 0 ? "100vw" : "50vw"} className="brand-collage-img" />
        </Link>
      ))}
    </section>
  );
}
