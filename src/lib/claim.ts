import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { cart, cartItem, customerOrder, product, productVariant, user } from "@/db/schema";
import { newId } from "./ids";

export const CART_COOKIE = "glossy_cart";

export async function claimUserCommerce(userId: string) {
  const [accountUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!accountUser?.emailVerified) return;

  await db
    .update(customerOrder)
    .set({ userId, updatedAt: new Date() })
    .where(and(isNull(customerOrder.userId), sql`lower(${customerOrder.email}) = lower(${accountUser.email})`));

  try {
    const jar = await cookies();
    const token = jar.get(CART_COOKIE)?.value;
    if (!token) return;
    await mergeGuestCart(userId, token);
    jar.delete(CART_COOKIE);
  } catch {
    // Cookie writes are only available during a request.
  }
}

export async function mergeGuestCart(userId: string, token: string) {
  // Same variant quantities are summed, then capped at 99 and at the current stock.
  // Archived, unpublished, and inactive variants are not copied.
  const guest = await db.query.cart.findFirst({
    where: eq(cart.token, token),
    with: { items: true },
  });
  if (!guest || guest.items.length === 0) return;

  const variantIds = guest.items.map((item) => item.variantId);
  const details = await db
    .select({
      id: productVariant.id,
      stockQty: productVariant.stockQty,
      isActive: productVariant.isActive,
      published: product.isPublished,
      archivedAt: product.archivedAt,
      priceMinor: productVariant.priceMinor,
    })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(inArray(productVariant.id, variantIds));
  const detailById = new Map(details.map((row) => [row.id, row]));

  function accepted(variantId: string, qty: number) {
    const detail = detailById.get(variantId);
    if (!detail || !detail.isActive || !detail.published || detail.archivedAt || detail.stockQty < 1) return null;
    return { qty: Math.min(99, detail.stockQty, qty), priceMinor: detail.priceMinor };
  }

  const userCart = await db.query.cart.findFirst({
    where: eq(cart.userId, userId),
    with: { items: true },
  });

  if (!userCart) {
    await db.update(cart).set({ userId, token: null, updatedAt: new Date() }).where(eq(cart.id, guest.id));
    for (const item of guest.items) {
      const next = accepted(item.variantId, item.qty);
      if (!next) {
        await db.delete(cartItem).where(eq(cartItem.id, item.id));
        continue;
      }
      await db
        .update(cartItem)
        .set({ qty: next.qty, priceSeenMinor: next.priceMinor })
        .where(eq(cartItem.id, item.id));
    }
    return;
  }
  if (userCart.id === guest.id) return;

  for (const item of guest.items) {
    const existing = userCart.items.find((row) => row.variantId === item.variantId);
    const combined = (existing?.qty ?? 0) + item.qty;
    const next = accepted(item.variantId, combined);
    if (!next) continue;
    if (existing) {
      await db
        .update(cartItem)
        .set({ qty: next.qty, priceSeenMinor: next.priceMinor })
        .where(eq(cartItem.id, existing.id));
    } else {
      await db.insert(cartItem).values({
        id: newId(),
        cartId: userCart.id,
        variantId: item.variantId,
        qty: next.qty,
        priceSeenMinor: next.priceMinor,
      });
    }
  }
  await db.delete(cart).where(eq(cart.id, guest.id));
}
