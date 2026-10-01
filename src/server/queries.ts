import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  address,
  brand,
  category,
  contactMessage,
  contentPage,
  customerOrder,
  deliveryZone,
  discountCode,
  offer,
  product,
  productImage,
  productVariant,
  storeSetting,
  user,
} from "@/db/schema";
import { canReadOrder } from "@/lib/access";
import { decodeSlug } from "@/lib/text";
import { describeCartLine } from "@/lib/cart-lines";
import { readCart } from "@/lib/cart";
import { isOrderStatus, isPaymentMethod, isPaymentStatus, variantLabel } from "@/lib/labels";
import { one } from "@/lib/pagination";
import { discountMessage, discountWindowProblem, priceOrder } from "@/lib/pricing";

export const getSettings = cache(async () => {
  const [row] = await db.select().from(storeSetting).limit(1);
  return row ?? null;
});

export async function listOwnAddresses(userId: string) {
  return db.select().from(address).where(eq(address.userId, userId)).orderBy(desc(address.isDefault), desc(address.createdAt));
}

export async function listActiveCategories() {
  return db
    .select()
    .from(category)
    .where(eq(category.isActive, true))
    .orderBy(asc(category.sortOrder), asc(category.name));
}

export async function listActiveBrands() {
  return db
    .select()
    .from(brand)
    .where(eq(brand.isActive, true))
    .orderBy(asc(brand.sortOrder), asc(brand.name));
}

export async function listActiveOffers() {
  const now = new Date();
  return db
    .select()
    .from(offer)
    .where(
      and(
        eq(offer.isActive, true),
        or(isNull(offer.startsAt), lte(offer.startsAt, now)),
        or(isNull(offer.endsAt), sql`${offer.endsAt} >= ${now}`),
      ),
    )
    .orderBy(asc(offer.sortOrder), desc(offer.createdAt));
}

function catalogWhere(filters: {
  q?: string;
  categorySlug?: string;
  brandSlug?: string;
  featuredOnly?: boolean;
  publishedOnly: boolean;
}) {
  const conditions = [];
  if (filters.publishedOnly) {
    conditions.push(eq(product.isPublished, true));
    conditions.push(isNull(product.archivedAt));
  }
  if (filters.featuredOnly) conditions.push(eq(product.isFeatured, true));
  if (filters.categorySlug) conditions.push(eq(category.slug, filters.categorySlug));
  if (filters.brandSlug) conditions.push(eq(brand.slug, filters.brandSlug));
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_\\]/g, "")}%`;
    conditions.push(or(ilike(product.name, term), ilike(product.description, term)));
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function listProducts(input: {
  q?: string;
  categorySlug?: string;
  brandSlug?: string;
  featuredOnly?: boolean;
  newest?: boolean;
  publishedOnly: boolean;
  offset: number;
  limit: number;
}) {
  const where = catalogWhere(input);
  const rows = await db
    .select({
      id: product.id,
      name: product.name,
      slug: product.slug,
      isFeatured: product.isFeatured,
      isPublished: product.isPublished,
      categoryName: category.name,
      brandName: brand.name,
    })
    .from(product)
    .leftJoin(category, eq(category.id, product.categoryId))
    .leftJoin(brand, eq(brand.id, product.brandId))
    .where(where)
    .orderBy(
      ...(input.newest
        ? [desc(product.createdAt)]
        : [desc(product.sortOrder), desc(product.createdAt)]),
    )
    .limit(input.limit)
    .offset(input.offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(product)
    .leftJoin(category, eq(category.id, product.categoryId))
    .leftJoin(brand, eq(brand.id, product.brandId))
    .where(where);

  const ids = rows.map((row) => row.id);
  const variants =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(productVariant)
          .where(and(inArray(productVariant.productId, ids), eq(productVariant.isActive, true)));
  const images =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(productImage)
          .where(inArray(productImage.productId, ids))
          .orderBy(asc(productImage.sortOrder));

  const cards = rows.map((row) => {
    const productVariants = variants.filter((item) => item.productId === row.id);
    const prices = productVariants.map((item) => item.priceMinor);
    const image = images.find((item) => item.productId === row.id);
    return {
      ...row,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? row.name,
      minPriceMinor: prices.length ? Math.min(...prices) : null,
      inStock: productVariants.some((item) => item.stockQty > 0),
    };
  });

  return { cards, total: total ?? 0 };
}

export async function getProductBySlug(slug: string) {
  const row = await db.query.product.findFirst({
    where: eq(product.slug, decodeSlug(slug)),
    with: {
      category: true,
      brand: true,
      variants: true,
      images: true,
    },
  });
  if (!row || !row.isPublished || row.archivedAt) return null;
  return {
    ...row,
    variants: row.variants.filter((item) => item.isActive).sort((a, b) => a.sku.localeCompare(b.sku)),
    images: [...row.images].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function getContentPage(slug: string) {
  const [row] = await db.select().from(contentPage).where(eq(contentPage.slug, slug)).limit(1);
  return row ?? null;
}

export async function listDeliveryZones() {
  return db
    .select()
    .from(deliveryZone)
    .where(eq(deliveryZone.isActive, true))
    .orderBy(asc(deliveryZone.sortOrder), asc(deliveryZone.name));
}

const ownOrderColumns = {
  id: true,
  number: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  recipientName: true,
  phone: true,
  email: true,
  city: true,
  area: true,
  street: true,
  notes: true,
  deliveryZoneName: true,
  currency: true,
  subtotalMinor: true,
  discountMinor: true,
  deliveryFeeMinor: true,
  totalMinor: true,
  discountCode: true,
  createdAt: true,
} as const;

export async function getOwnOrder(userId: string, number: string) {
  const row = await db.query.customerOrder.findFirst({
    where: and(eq(customerOrder.number, number), eq(customerOrder.userId, userId)),
    columns: { ...ownOrderColumns, userId: true },
    with: { items: true },
  });
  if (!row) return null;
  const { userId: ownerId, ...order } = row;
  if (!canReadOrder(ownerId, userId)) return null;
  return order;
}

export async function listOwnOrders(userId: string, offset: number, limit: number) {
  const rows = await db
    .select({
      id: customerOrder.id,
      number: customerOrder.number,
      status: customerOrder.status,
      paymentStatus: customerOrder.paymentStatus,
      currency: customerOrder.currency,
      totalMinor: customerOrder.totalMinor,
    })
    .from(customerOrder)
    .where(eq(customerOrder.userId, userId))
    .orderBy(desc(customerOrder.createdAt))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(customerOrder)
    .where(eq(customerOrder.userId, userId));
  return { rows, total: total ?? 0 };
}

export async function getOrderByToken(token: string) {
  return db.query.customerOrder.findFirst({
    where: eq(customerOrder.publicToken, token),
    columns: { ...ownOrderColumns, publicToken: true },
    with: { items: true },
  });
}

export function parseOrderDay(value: string | undefined, end: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type OrderRange = { from?: Date | null; to?: Date | null };

function orderRangeWhere(range?: OrderRange) {
  const parts = [];
  if (range?.from) parts.push(gte(customerOrder.createdAt, range.from));
  if (range?.to) parts.push(lte(customerOrder.createdAt, range.to));
  return parts.length ? and(...parts) : undefined;
}

export async function salesSummary(range?: OrderRange) {
  const where = orderRangeWhere(range);
  const [totals] = await db
    .select({
      orders: sql<number>`count(*)::int`,
      openOrders: sql<number>`count(*) filter (where ${customerOrder.status} <> 'cancelled')::int`,
      cancelledOrders: sql<number>`count(*) filter (where ${customerOrder.status} = 'cancelled')::int`,
      unpaidOrders: sql<number>`count(*) filter (where ${customerOrder.status} <> 'cancelled' and ${customerOrder.paymentStatus} in ('unpaid', 'awaiting_transfer'))::int`,
      revenueMinor: sql<number>`coalesce(sum(${customerOrder.totalMinor}) filter (where ${customerOrder.status} <> 'cancelled' and ${customerOrder.paymentStatus} = 'paid'), 0)::int`,
    })
    .from(customerOrder)
    .where(where);
  const byStatus = await db
    .select({
      status: customerOrder.status,
      count: sql<number>`count(*)::int`,
    })
    .from(customerOrder)
    .where(where)
    .groupBy(customerOrder.status);
  const recent = await db
    .select({
      id: customerOrder.id,
      number: customerOrder.number,
      status: customerOrder.status,
      paymentStatus: customerOrder.paymentStatus,
      totalMinor: customerOrder.totalMinor,
    })
    .from(customerOrder)
    .where(where)
    .orderBy(desc(customerOrder.createdAt))
    .limit(8);
  return { totals, byStatus, recent };
}

export type AdminOrderFilters = {
  q?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  from?: Date | null;
  to?: Date | null;
};

function searchTerm(q: string | undefined) {
  const term = (q ?? "").replace(/[%_\\]/g, "").trim();
  return term ? `%${term}%` : null;
}

export async function listAdminOrders(filters: AdminOrderFilters, offset: number, limit: number) {
  const parts = [];
  const term = searchTerm(filters.q);
  if (term) {
    parts.push(
      or(
        ilike(customerOrder.number, term),
        ilike(customerOrder.recipientName, term),
        ilike(customerOrder.email, term),
      ),
    );
  }
  if (filters.status && isOrderStatus(filters.status)) parts.push(eq(customerOrder.status, filters.status));
  if (filters.paymentStatus && isPaymentStatus(filters.paymentStatus)) {
    parts.push(eq(customerOrder.paymentStatus, filters.paymentStatus));
  }
  if (filters.paymentMethod && isPaymentMethod(filters.paymentMethod)) {
    parts.push(eq(customerOrder.paymentMethod, filters.paymentMethod));
  }
  if (filters.from) parts.push(gte(customerOrder.createdAt, filters.from));
  if (filters.to) parts.push(lte(customerOrder.createdAt, filters.to));
  const where = parts.length ? and(...parts) : undefined;
  const rows = await db
    .select({
      id: customerOrder.id,
      number: customerOrder.number,
      status: customerOrder.status,
      paymentStatus: customerOrder.paymentStatus,
      totalMinor: customerOrder.totalMinor,
      currency: customerOrder.currency,
    })
    .from(customerOrder)
    .where(where)
    .orderBy(desc(customerOrder.createdAt))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(customerOrder)
    .where(where);
  return { rows, total: total ?? 0 };
}

export async function getAdminOrder(id: string) {
  return db.query.customerOrder.findFirst({
    where: eq(customerOrder.id, id),
    with: {
      items: true,
      paidBy: { columns: { id: true, name: true } },
      events: { with: { actor: { columns: { id: true, name: true } } } },
    },
  });
}

export async function listCustomers(q: string, offset: number, limit: number) {
  const where = q
    ? and(eq(user.role, "user"), or(ilike(user.name, `%${q.replace(/[%_\\]/g, "")}%`), ilike(user.email, `%${q.replace(/[%_\\]/g, "")}%`)))
    : eq(user.role, "user");
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      banned: user.banned,
    })
    .from(user)
    .where(where)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(user).where(where);
  return { rows, total: total ?? 0 };
}

export async function getCustomer(id: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      banned: user.banned,
      banReason: user.banReason,
    })
    .from(user)
    .where(and(eq(user.id, id), eq(user.role, "user")))
    .limit(1);
  if (!row) return null;
  const orders = await db
    .select()
    .from(customerOrder)
    .where(eq(customerOrder.userId, id))
    .orderBy(desc(customerOrder.createdAt));
  return { user: row, orders };
}

export async function listMessages(offset: number, limit: number) {
  const rows = await db
    .select()
    .from(contactMessage)
    .orderBy(desc(contactMessage.createdAt))
    .limit(limit)
    .offset(offset);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(contactMessage);
  return { rows, total: total ?? 0 };
}

export async function quoteCheckout(deliveryZoneId: string, codeInput: string) {
  const [cart, settings, zones] = await Promise.all([readCart(), getSettings(), listDeliveryZones()]);
  const zone = zones.find((item) => item.id === deliveryZoneId) ?? zones[0] ?? null;
  const lines = (cart?.items ?? []).map((item) => {
    const sellable = Boolean(
      item.variant?.isActive && item.variant.product?.isPublished && !item.variant.product.archivedAt,
    );
    const status = describeCartLine({
      qty: item.qty,
      stockQty: item.variant?.stockQty ?? 0,
      unitPriceMinor: item.variant?.priceMinor ?? 0,
      priceSeenMinor: item.priceSeenMinor ?? null,
      sellable,
    });
    return {
      variantId: item.variant.id,
      name: item.variant.product.name,
      label: variantLabel(item.variant.shadeName, item.variant.sizeName),
      qty: item.qty,
      unitPriceMinor: item.variant.priceMinor,
      lineTotalMinor: item.variant.priceMinor * item.qty,
      stockQty: item.variant.stockQty,
      messages: status.messages,
      blocked: status.blocked,
    };
  });
  const purchasable = lines.filter((line) => !line.blocked);
  const blocked = lines.some((line) => line.blocked);
  let discountError = "";
  let discount = null;
  const code = codeInput.trim().toUpperCase();
  if (code) {
    const [row] = await db.select().from(discountCode).where(eq(discountCode.code, code)).limit(1);
    const problem = row ? discountWindowProblem(row, new Date()) : "unknown";
    if (problem) discountError = discountMessage(problem);
    else if (row) {
      discount = {
        type: row.type === "percent" ? ("percent" as const) : ("fixed" as const),
        value: row.value,
        minSubtotalMinor: row.minSubtotalMinor,
      };
    }
  }
  const totals =
    purchasable.length && zone
      ? priceOrder({
          lines: purchasable,
          discount,
          deliveryFeeMinor: zone.feeMinor,
        })
      : null;
  if (discount && totals && totals.discountMinor === 0 && totals.subtotalMinor < discount.minSubtotalMinor) {
    discountError = discountMessage("minimum");
  }
  return { cart, settings, zones, zone, lines, totals, discountError, code, blocked };
}

export async function adminCatalogFilters(params: {
  q?: string | string[];
  category?: string | string[];
  brand?: string | string[];
}) {
  return {
    q: one(params.q).trim(),
    categorySlug: one(params.category).trim(),
    brandSlug: one(params.brand).trim(),
  };
}
