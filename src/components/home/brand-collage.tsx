import Link from "next/link";

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
        <Link key={tile.slot} className={tile.slot % 3 === 0 ? "is-full" : "is-half"} href={collageHref(tile)}>
          {/* Uploaded collage photos are not known at build time. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tile.imageUrl} alt="" />
        </Link>
      ))}
    </section>
  );
}
