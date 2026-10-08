"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Stepper } from "@/components/controls/stepper";
import { PlateImage } from "@/components/ui";
import { formatMinor } from "@/lib/money";
import { variantLabel } from "@/lib/labels";
import { addToCartAction } from "@/server/actions/cart";

type Variant = {
  id: string;
  sku: string;
  shadeName: string | null;
  sizeName: string | null;
  priceMinor: number;
  compareAtPriceMinor: number | null;
  stockQty: number;
};

type Image = {
  id: string;
  url: string;
  alt: string;
  variantId: string | null;
};

export function ProductPurchase({
  name,
  description,
  eyebrow,
  variants,
  images,
  currency,
  minorUnit,
  titleTag = "h1",
  titleId,
  surface = "page",
  backHref,
}: {
  name: string;
  description: string;
  eyebrow: string;
  variants: Variant[];
  images: Image[];
  currency: string;
  minorUnit: number;
  titleTag?: "h1" | "h2";
  titleId?: string;
  surface?: "page" | "dialog";
  backHref?: string;
}) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [galleryVariantId, setGalleryVariantId] = useState(variants[0]?.id ?? "");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [state, action, pending] = useActionState(addToCartAction, null);
  const variant = variants.find((item) => item.id === variantId) ?? variants[0];
  const shades = useMemo(
    () => [...new Set(variants.map((item) => item.shadeName).filter((item): item is string => Boolean(item)))],
    [variants],
  );
  const sizes = useMemo(
    () => [...new Set(variants.map((item) => item.sizeName).filter((item): item is string => Boolean(item)))],
    [variants],
  );
  const gallery = useMemo(() => {
    if (!variant) return images;
    const specific = images.filter((image) => image.variantId === variant.id);
    if (specific.length) return specific;
    const shared = images.filter((image) => !image.variantId);
    return shared.length ? shared : images;
  }, [images, variant]);

  if (variant && galleryVariantId !== variant.id) {
    setGalleryVariantId(variant.id);
    setActiveId(null);
  }
  const active = gallery.find((image) => image.id === activeId) ?? gallery[0];

  if (!variant) return <p>هذا المنتج لا يملك خيارات متاحة.</p>;
  const Title = titleTag;

  function choiceInStock(shade: string | undefined, size: string | undefined) {
    return variants.some(
      (item) =>
        item.stockQty > 0 &&
        (shade === undefined || item.shadeName === shade) &&
        (size === undefined || item.sizeName === size),
    );
  }

  function choose(next: { shade?: string; size?: string }) {
    const shade = next.shade ?? variant?.shadeName ?? undefined;
    const size = next.size ?? variant?.sizeName ?? undefined;
    const match =
      variants.find((item) => item.shadeName === (shade || null) && item.sizeName === (size || null)) ??
      variants.find((item) => (next.shade ? item.shadeName === next.shade : item.sizeName === next.size));
    if (match) setVariantId(match.id);
  }

  return (
    <div className={surface === "dialog" ? "product-split is-dialog" : "product-split"}>
      <div className="product-media">
        <div className="product-hero">
          {backHref ? (
            <Link className="product-back" href={backHref}>
              العودة للنتائج
            </Link>
          ) : null}
          <PlateImage key={active?.url} src={active?.url ?? null} alt={active?.alt || name} bare photo className="product-hero-img" />
        </div>
        {gallery.length > 1 ? (
          <div className="product-gallery" role="group" aria-label="صور المنتج">
            {gallery.map((image) => (
              <button
                key={image.id}
                type="button"
                className="gallery-thumb"
                aria-pressed={image.id === active?.id}
                aria-label={image.alt || name}
                onClick={() => setActiveId(image.id)}
              >
                <PlateImage src={image.url} alt="" className="product-thumb-img" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <form action={action} className={surface === "dialog" ? "product-buy" : "card product-buy"}>
        <input type="hidden" name="variantId" value={variant.id} />
        <Title className="product-title" id={titleId}>{name}</Title>
        {eyebrow ? <p className="quiet">{eyebrow}</p> : null}
        {description ? <p className="quiet max-w-md whitespace-pre-wrap">{description}</p> : null}
        <p className="price text-lg">
          {variant.compareAtPriceMinor && variant.compareAtPriceMinor > variant.priceMinor ? (
            <s>{formatMinor(variant.compareAtPriceMinor, currency, minorUnit)}</s>
          ) : null}
          <span>{formatMinor(variant.priceMinor, currency, minorUnit)}</span>
        </p>
        <p className="quiet">{variantLabel(variant.shadeName, variant.sizeName)}</p>
        {variant.stockQty > 0 ? null : <p>نفد المخزون</p>}
        {shades.length > 0 ? (
          <fieldset className="grid gap-2 border-0 p-0">
            <legend className="quiet">الدرجة</legend>
            <div className="flex flex-wrap gap-4">
              {shades.map((shade) => {
                const available = choiceInStock(shade, sizes.length > 0 ? (variant.sizeName ?? undefined) : undefined);
                return (
                  <button
                    key={shade}
                    type="button"
                    className={available ? "shade" : "shade is-unavailable"}
                    aria-pressed={variant.shadeName === shade}
                    onClick={() => choose({ shade })}
                  >
                    {shade}
                    {available ? "" : " · نفد"}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        {sizes.length > 0 ? (
          <fieldset className="grid gap-2 border-0 p-0">
            <legend className="quiet">المقاس</legend>
            <div className="flex flex-wrap gap-4">
              {sizes.map((size) => {
                const available = choiceInStock(shades.length > 0 ? (variant.shadeName ?? undefined) : undefined, size);
                return (
                  <button
                    key={size}
                    type="button"
                    className={available ? "size-pick" : "size-pick is-unavailable"}
                    aria-pressed={variant.sizeName === size}
                    onClick={() => choose({ size })}
                  >
                    {size}
                    {available ? "" : " · نفد"}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        <label className="grid max-w-28 gap-1">
          <span className="quiet">الكمية</span>
          <Stepper name="qty" defaultValue={1} min={1} max={Math.max(1, variant.stockQty)} label="الكمية" />
        </label>
        {state?.error ? (
          <p className="alert" role="alert">
            {state.error}
          </p>
        ) : null}
        <button className="btn btn-primary w-full md:w-fit" type="submit" disabled={pending || variant.stockQty < 1}>
          {pending ? "لحظة..." : "أضيفي إلى السلة"}
        </button>
      </form>
    </div>
  );
}
