import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { cart, cartItem, product, productVariant } from "@/db/schema";
import { CART_COOKIE, mergeGuestCart } from "./claim";
import { newId } from "./ids";
import { getCurrentUser } from "./session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: process.env.NODE_ENV === "production",
};

export async function readCart() {
  const current = await getCurrentUser();
  if (current && !current.banned) {
    return db.query.cart.findFirst({
      where: eq(cart.userId, current.id),
      with: {
        items: {
          with: {
            variant: {
              with: { product: true },
            },
          },
        },
      },
    });
  }

  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  return db.query.cart.findFirst({
    where: and(eq(cart.token, token), isNull(cart.userId)),
    with: {
      items: {
        with: {
          variant: { with: { product: true } },
        },
      },
    },
  });
}

export async function getOrCreateCart() {
  const current = await getCurrentUser();
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;

  if (current && !current.banned) {
    if (token) {
      await mergeGuestCart(current.id, token);
      jar.delete(CART_COOKIE);
    }
    const existing = await db.query.cart.findFirst({ where: eq(cart.userId, current.id) });
    if (existing) return existing;
    const id = newId();
    await db.insert(cart).values({ id, userId: current.id });
    return { id, userId: current.id, token: null };
  }

  if (token) {
    const existing = await db.query.cart.findFirst({ where: eq(cart.token, token) });
    if (existing && !existing.userId) return existing;
  }

  const id = newId();
  const nextToken = newId();
  await db.insert(cart).values({ id, token: nextToken });
  jar.set(CART_COOKIE, nextToken, cookieOptions);
  return { id, userId: null, token: nextToken };
}

export async function cartCount() {
  const currentCart = await readCart();
  return currentCart?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0;
}

export async function addVariantToCart(variantId: string, qty: number) {
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
    throw new Error("كمية غير صالحة");
  }
  const [variant] = await db
    .select({
      id: productVariant.id,
      priceMinor: productVariant.priceMinor,
      stockQty: productVariant.stockQty,
      isActive: productVariant.isActive,
      published: product.isPublished,
      archivedAt: product.archivedAt,
    })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(eq(productVariant.id, variantId))
    .limit(1);
  if (!variant || !variant.isActive || !variant.published || variant.archivedAt) {
    throw new Error("المنتج غير متاح");
  }

  const active = await getOrCreateCart();
  const [existing] = await db
    .select()
    .from(cartItem)
    .where(and(eq(cartItem.cartId, active.id), eq(cartItem.variantId, variantId)))
    .limit(1);
  const nextQty = Math.min(99, (existing?.qty ?? 0) + qty);
  if (nextQty > variant.stockQty) {
    throw new Error("الكمية المطلوبة أكبر من المتوفر");
  }
  if (existing) {
    await db
      .update(cartItem)
      .set({ qty: nextQty, priceSeenMinor: variant.priceMinor })
      .where(eq(cartItem.id, existing.id));
  } else {
    await db.insert(cartItem).values({
      id: newId(),
      cartId: active.id,
      variantId,
      qty: nextQty,
      priceSeenMinor: variant.priceMinor,
    });
  }
}

export async function setCartQty(itemId: string, qty: number) {
  const active = await readCart();
  const item = active?.items.find((row) => row.id === itemId);
  if (!active || !item) throw new Error("العنصر غير موجود");
  if (qty <= 0) {
    await db.delete(cartItem).where(and(eq(cartItem.id, itemId), eq(cartItem.cartId, active.id)));
    return;
  }
  if (qty > 99 || qty > item.variant.stockQty) throw new Error("الكمية غير متاحة");
  await db
    .update(cartItem)
    .set({ qty, priceSeenMinor: item.variant.priceMinor })
    .where(and(eq(cartItem.id, itemId), eq(cartItem.cartId, active.id)));
}

export async function removeCartItem(itemId: string) {
  const active = await readCart();
  if (!active) return;
  await db.delete(cartItem).where(and(eq(cartItem.id, itemId), eq(cartItem.cartId, active.id)));
}
