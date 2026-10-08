"use server";

import { getProductBySlug } from "@/server/queries";

export async function loadQuickView(slug: string) {
  const product = await getProductBySlug(slug);
  if (!product) return null;
  return {
    name: product.name,
    description: product.description,
    eyebrow: [product.brand?.name, product.category?.name].filter(Boolean).join(" · "),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      shadeName: variant.shadeName,
      sizeName: variant.sizeName,
      priceMinor: variant.priceMinor,
      compareAtPriceMinor: variant.compareAtPriceMinor,
      stockQty: variant.stockQty,
    })),
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      variantId: image.variantId,
    })),
  };
}
