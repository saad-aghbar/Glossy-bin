import { and, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customerOrder,
  deliveryZone,
  discountCode,
  orderEvent,
  orderItem,
  product,
  productVariant,
  stockMovement,
  storeSetting,
  address,
  cartItem,
} from "@/db/schema";
import { assertCanAdmin } from "./access";
import { newId, orderNumber, publicToken } from "./ids";
import type { PaymentMethod } from "./labels";
import { isOrderStatus, nextOrderStatuses, variantLabel } from "./labels";
import { discountMessage, discountWindowProblem, priceOrder, type DiscountRule } from "./pricing";
import { isUniqueViolation } from "./text";

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type StoredOrder = typeof customerOrder.$inferSelect;
type StoredSettings = typeof storeSetting.$inferSelect;

function orderResult(order: StoredOrder, settings: StoredSettings) {
  return {
    id: order.id,
    number: order.number,
    publicToken: order.publicToken,
    totalMinor: order.totalMinor,
    currency: settings.currency,
    minorUnit: settings.minorUnit,
  };
}

export type CheckoutInput = {
  cartId: string;
  userId: string | null;
  recipientName: string;
  phone: string;
  email: string;
  city: string;
  area: string;
  street: string;
  notes: string;
  deliveryZoneId: string;
  discountCode: string;
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
  saveAddress: boolean;
};

async function reserveNumber(tx: Tx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const number = orderNumber();
    const [existing] = await tx
      .select({ id: customerOrder.id })
      .from(customerOrder)
      .where(eq(customerOrder.number, number))
      .limit(1);
    if (!existing) return number;
  }
  throw new CheckoutError("تعذر إنشاء رقم الطلب");
}

export async function placeOrder(input: CheckoutInput) {
  const [settings] = await db.select().from(storeSetting).limit(1);
  if (!settings) throw new CheckoutError("إعدادات المتجر غير مكتملة");
  if (input.paymentMethod === "cod" && !settings.codEnabled) {
    throw new CheckoutError("الدفع عند الاستلام غير متاح");
  }
  if (input.paymentMethod === "bank_transfer" && !settings.bankTransferEnabled) {
    throw new CheckoutError("التحويل البنكي غير متاح");
  }

  const key = input.idempotencyKey?.trim() || undefined;
  if (key) {
    const [existing] = await db
      .select()
      .from(customerOrder)
      .where(eq(customerOrder.idempotencyKey, key))
      .limit(1);
    if (existing) return orderResult(existing, settings);
  }

  try {
  const placed = await db.transaction(async (tx) => {
    if (key) {
      const [existing] = await tx
        .select()
        .from(customerOrder)
        .where(eq(customerOrder.idempotencyKey, key))
        .limit(1);
      if (existing) return orderResult(existing, settings);
    }
    const cart = await tx.query.cart.findFirst({
      where: (table, { eq: equals }) => equals(table.id, input.cartId),
      with: { items: true },
    });
    if (!cart || cart.items.length === 0) throw new CheckoutError("السلة فارغة");
    if (input.userId && cart.userId !== input.userId) throw new CheckoutError("السلة غير متاحة");
    if (!input.userId && cart.userId) throw new CheckoutError("السلة غير متاحة");

    const variantIds = cart.items.map((item) => item.variantId);
    const locked = await tx
      .select()
      .from(productVariant)
      .where(inArray(productVariant.id, variantIds))
      .for("update");
    const productIds = [...new Set(locked.map((row) => row.productId))];
    const products = await tx.select().from(product).where(inArray(product.id, productIds));

    const lines = cart.items.map((item) => {
      const variant = locked.find((row) => row.id === item.variantId);
      const parent = products.find((row) => row.id === variant?.productId);
      if (!variant || !variant.isActive || !parent?.isPublished || parent.archivedAt) {
        throw new CheckoutError("أحد المنتجات لم يعد متاحاً");
      }
      if (item.qty < 1 || item.qty > 99) throw new CheckoutError("كمية غير صالحة");
      if (variant.stockQty < item.qty) {
        throw new CheckoutError(`الكمية غير كافية: ${parent.name}`);
      }
      return { item, variant, parent };
    });

    const [zone] = await tx
      .select()
      .from(deliveryZone)
      .where(and(eq(deliveryZone.id, input.deliveryZoneId), eq(deliveryZone.isActive, true)))
      .for("update")
      .limit(1);
    if (!zone) throw new CheckoutError("منطقة التوصيل غير متاحة");

    const code = input.discountCode.trim().toUpperCase();
    let discount: DiscountRule | null = null;
    let codeRow: typeof discountCode.$inferSelect | null = null;
    if (code) {
      const [row] = await tx
        .select()
        .from(discountCode)
        .where(eq(discountCode.code, code))
        .for("update")
        .limit(1);
      const problem = row ? discountWindowProblem(row, new Date()) : "unknown";
      if (!row || problem) throw new CheckoutError(discountMessage(problem ?? "unknown"));
      codeRow = row;
      discount = {
        type: row.type === "percent" ? "percent" : "fixed",
        value: row.value,
        minSubtotalMinor: row.minSubtotalMinor,
      };
    }

    const totals = priceOrder({
      lines: lines.map((line) => ({
        variantId: line.variant.id,
        unitPriceMinor: line.variant.priceMinor,
        qty: line.item.qty,
      })),
      discount,
      deliveryFeeMinor: zone.feeMinor,
    });

    if (codeRow && totals.subtotalMinor < codeRow.minSubtotalMinor) {
      throw new CheckoutError(discountMessage("minimum"));
    }

    if (codeRow) {
      const consumed = await tx
        .update(discountCode)
        .set({
          usedCount: sql`${discountCode.usedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(discountCode.id, codeRow.id),
            or(isNull(discountCode.usageLimit), sql`${discountCode.usedCount} < ${discountCode.usageLimit}`),
          ),
        )
        .returning({ id: discountCode.id });
      if (consumed.length !== 1) throw new CheckoutError(discountMessage("used"));
    }

    for (const line of lines) {
      const updated = await tx
        .update(productVariant)
        .set({
          stockQty: sql`${productVariant.stockQty} - ${line.item.qty}`,
          updatedAt: new Date(),
        })
        .where(and(eq(productVariant.id, line.variant.id), gte(productVariant.stockQty, line.item.qty)))
        .returning({ id: productVariant.id });
      if (updated.length !== 1) throw new CheckoutError("الكمية لم تعد متاحة");
    }

    const orderId = newId();
    const number = await reserveNumber(tx);
    const token = publicToken();
    const paymentStatus = input.paymentMethod === "bank_transfer" ? "awaiting_transfer" : "unpaid";

    await tx.insert(customerOrder).values({
      id: orderId,
      number,
      publicToken: token,
      userId: input.userId,
      status: "pending",
      paymentMethod: input.paymentMethod,
      paymentStatus,
      recipientName: input.recipientName,
      phone: input.phone,
      email: input.email,
      city: input.city,
      area: input.area,
      street: input.street,
      notes: input.notes || null,
      deliveryZoneId: zone.id,
      deliveryZoneName: zone.name,
      currency: settings.currency,
      subtotalMinor: totals.subtotalMinor,
      discountMinor: totals.discountMinor,
      deliveryFeeMinor: totals.deliveryFeeMinor,
      totalMinor: totals.totalMinor,
      discountCodeId: codeRow?.id ?? null,
      discountCode: codeRow?.code ?? null,
      idempotencyKey: key ?? null,
    });

    await tx.insert(orderItem).values(
      lines.map((line) => ({
        id: newId(),
        orderId,
        variantId: line.variant.id,
        productName: line.parent.name,
        variantLabel: variantLabel(line.variant.shadeName, line.variant.sizeName),
        sku: line.variant.sku,
        unitPriceMinor: line.variant.priceMinor,
        qty: line.item.qty,
        lineTotalMinor: line.variant.priceMinor * line.item.qty,
      })),
    );

    await tx.insert(stockMovement).values(
      lines.map((line) => ({
        id: newId(),
        variantId: line.variant.id,
        delta: -line.item.qty,
        reason: "order",
        orderId,
      })),
    );

    await tx.delete(cartItem).where(eq(cartItem.cartId, cart.id));

    if (input.saveAddress && input.userId) {
      await tx.insert(address).values({
        id: newId(),
        userId: input.userId,
        recipientName: input.recipientName,
        phone: input.phone,
        city: input.city,
        area: input.area,
        street: input.street,
        notes: input.notes || null,
        isDefault: false,
      });
    }

    return {
      id: orderId,
      number,
      publicToken: token,
      totalMinor: totals.totalMinor,
      currency: settings.currency,
      minorUnit: settings.minorUnit,
    };
  });

  return placed;
  } catch (error) {
    if (key && isUniqueViolation(error)) {
      const [existing] = await db
        .select()
        .from(customerOrder)
        .where(eq(customerOrder.idempotencyKey, key))
        .limit(1);
      if (existing) return orderResult(existing, settings);
    }
    throw error;
  }
}

export async function transitionOrder(input: {
  actorId: string;
  actorRole: string | null;
  orderId: string;
  status: string;
}) {
  assertCanAdmin(input.actorRole);
  if (!isOrderStatus(input.status)) throw new CheckoutError("حالة غير صالحة");
  const nextStatus = input.status;
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(customerOrder)
      .where(eq(customerOrder.id, input.orderId))
      .for("update")
      .limit(1);
    if (!order) throw new CheckoutError("الطلب غير موجود");
    if (order.status === nextStatus) return { unchanged: true as const };
    if (!isOrderStatus(order.status)) throw new CheckoutError("حالة غير صالحة");
    if (nextStatus === "cancelled" && order.status === "delivered") {
      throw new CheckoutError("لا يمكن إلغاء طلب تم تسليمه.");
    }
    if (nextStatus === "cancelled" && order.paymentStatus === "paid") {
      throw new CheckoutError("لا يمكن إلغاء طلب مدفوع من هنا. إعادة المبلغ تتم يدوياً خارج النظام.");
    }
    if (order.status === "cancelled") throw new CheckoutError("لا يمكن إعادة فتح طلب ملغى");
    if (!nextOrderStatuses[order.status].includes(nextStatus)) {
      throw new CheckoutError("لا يمكن نقل الطلب إلى هذه الحالة.");
    }

    if (nextStatus === "cancelled") {
      const items = await tx.select().from(orderItem).where(eq(orderItem.orderId, order.id));
      for (const item of items) {
        if (!item.variantId) continue;
        const restored = await tx
          .update(productVariant)
          .set({
            stockQty: sql`${productVariant.stockQty} + ${item.qty}`,
            updatedAt: new Date(),
          })
          .where(eq(productVariant.id, item.variantId))
          .returning({ id: productVariant.id });
        if (restored.length === 1) {
          await tx.insert(stockMovement).values({
            id: newId(),
            variantId: item.variantId,
            delta: item.qty,
            reason: "cancel",
            orderId: order.id,
          });
        }
      }
    }

    const changedAt = new Date();
    await tx
      .update(customerOrder)
      .set({
        status: nextStatus,
        updatedAt: changedAt,
      })
      .where(eq(customerOrder.id, order.id));
    await tx.insert(orderEvent).values({
      id: newId(),
      orderId: order.id,
      actorUserId: input.actorId,
      kind: "status",
      fromStatus: order.status,
      toStatus: nextStatus,
      body: null,
    });
    return { unchanged: false as const };
  });
}

export async function addOrderNote(input: {
  actorId: string;
  actorRole: string | null;
  orderId: string;
  body: string;
}) {
  assertCanAdmin(input.actorRole);
  const body = input.body.trim();
  if (!body) throw new CheckoutError("اكتبي الملاحظة أولاً");
  if (body.length > 2000) throw new CheckoutError("الملاحظة طويلة");
  const [order] = await db
    .select({ id: customerOrder.id })
    .from(customerOrder)
    .where(eq(customerOrder.id, input.orderId))
    .limit(1);
  if (!order) throw new CheckoutError("الطلب غير موجود");
  await db.insert(orderEvent).values({
    id: newId(),
    orderId: order.id,
    actorUserId: input.actorId,
    kind: "note",
    fromStatus: null,
    toStatus: null,
    body,
  });
}

export async function recordPaymentReceived(input: {
  actorId: string;
  actorRole: string | null;
  orderId: string;
  confirmed: boolean;
}) {
  assertCanAdmin(input.actorRole);
  if (!input.confirmed) {
    throw new CheckoutError("أكّدي استلام المبلغ قبل التسجيل");
  }
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(customerOrder)
      .where(eq(customerOrder.id, input.orderId))
      .for("update")
      .limit(1);
    if (!order) throw new CheckoutError("الطلب غير موجود");
    if (order.paymentMethod !== "cod" && order.paymentMethod !== "bank_transfer") {
      throw new CheckoutError("لا يمكن تسجيل الدفع لهذه الطريقة");
    }
    if (order.status === "cancelled") {
      throw new CheckoutError("لا يمكن تسجيل دفع لطلب ملغى");
    }
    if (order.paymentStatus === "paid") {
      return { alreadyPaid: true as const, paidAt: order.paidAt, totalMinor: order.totalMinor };
    }
    const paidAt = new Date();
    await tx
      .update(customerOrder)
      .set({
        paymentStatus: "paid",
        paidAt,
        paidByUserId: input.actorId,
        updatedAt: paidAt,
      })
      .where(eq(customerOrder.id, order.id));
    return { alreadyPaid: false as const, paidAt, totalMinor: order.totalMinor };
  });
}
