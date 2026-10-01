import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import {
  address,
  cart,
  cartItem,
  customerOrder,
  deliveryZone,
  orderEvent,
  orderItem,
  product,
  productVariant,
  stockMovement,
  storeSetting,
  user,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { claimUserCommerce } from "@/lib/claim";
import { takeDevVerificationUrl } from "@/lib/email";
import { newId } from "@/lib/ids";
import { visibleBankInstructions } from "@/lib/links";
import { addOrderNote, placeOrder, recordPaymentReceived, transitionOrder } from "@/lib/orders";
import { priceOrder } from "@/lib/pricing";
import { deleteOwnAddress, updateOwnAddress } from "@/lib/ownership";
import { saveSettingsAction } from "@/server/actions/admin";
import { getCustomer, getOwnOrder, listAdminOrders, listDeliveryZones, listProducts, parseOrderDay, salesSummary } from "@/server/queries";

const createdUserIds: string[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

beforeAll(async () => {
  const [settings] = await db.select({ id: storeSetting.id }).from(storeSetting).limit(1);
  if (!settings) {
    await db.insert(storeSetting).values({
      id: "store",
      storeName: "Glossy",
      currency: "SAR",
      minorUnit: 100,
      codEnabled: true,
      bankTransferEnabled: true,
      defaultDeliveryFeeMinor: 0,
    });
  }
  const [zone] = await db.select({ id: deliveryZone.id }).from(deliveryZone).limit(1);
  if (!zone) {
    await db.insert(deliveryZone).values({
      id: newId(),
      name: "داخل المدينة",
      feeMinor: 1500,
      isActive: true,
      sortOrder: 1,
    });
  }
});

afterAll(async () => {
  if (createdProductIds.length) {
    const variants = await db
      .select({ id: productVariant.id })
      .from(productVariant)
      .where(inArray(productVariant.productId, createdProductIds));
    const variantIds = variants.map((row) => row.id);
    if (variantIds.length) {
      await db.delete(stockMovement).where(inArray(stockMovement.variantId, variantIds));
      await db.delete(orderItem).where(inArray(orderItem.variantId, variantIds));
      await db.delete(cartItem).where(inArray(cartItem.variantId, variantIds));
    }
    await db.delete(product).where(inArray(product.id, createdProductIds));
  }
  if (createdUserIds.length) {
    await db.delete(user).where(inArray(user.id, createdUserIds));
  }
  await pool.end();
});

async function actingAdmin() {
  const actorId = newId();
  createdUserIds.push(actorId);
  await db.insert(user).values({
    id: actorId,
    name: "مديرة السجل",
    email: `ops-${actorId}@example.com`,
    role: "admin",
  });
  return { actorId, actorRole: "admin" };
}

describe("commerce safeguards", () => {
  it("does not let public signup create an admin", async () => {
    const email = `role-${newId()}@example.com`;
    let rejected = false;
    try {
      await auth.api.signUpEmail({
        body: {
          name: "تجربة",
          email,
          password: "password123",
          role: "admin",
        } as { name: string; email: string; password: string },
      });
    } catch {
      rejected = true;
    }
    const [row] = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (row) createdUserIds.push(row.id);
    expect(row?.role === "admin").toBe(false);
    expect(row?.role === "user" || rejected).toBe(true);
  });

  it("stops a second checkout from overselling the last unit", async () => {
    const [zone] = await db.select().from(deliveryZone).limit(1);
    expect(zone).toBeTruthy();
    const productId = newId();
    const variantId = newId();
    createdProductIds.push(productId);
    await db.insert(product).values({
      id: productId,
      name: "اختبار المخزون",
      slug: `stock-${productId}`,
      description: "",
      isPublished: true,
    });
    await db.insert(productVariant).values({
      id: variantId,
      productId,
      sku: `TEST-${variantId.slice(0, 8)}`,
      priceMinor: 1000,
      stockQty: 1,
      isActive: true,
    });
    const cartA = newId();
    const cartB = newId();
    await db.insert(cart).values([
      { id: cartA, token: newId() },
      { id: cartB, token: newId() },
    ]);
    await db.insert(cartItem).values([
      { id: newId(), cartId: cartA, variantId, qty: 1 },
      { id: newId(), cartId: cartB, variantId, qty: 1 },
    ]);
    const base = {
      userId: null,
      recipientName: "اختبار",
      phone: "0500000000",
      email: `order-${newId()}@example.com`,
      city: "الرياض",
      area: "النخيل",
      street: "شارع ١",
      notes: "",
      deliveryZoneId: zone!.id,
      discountCode: "",
      paymentMethod: "cod" as const,
      saveAddress: false,
    };
    const results = await Promise.allSettled([
      placeOrder({ ...base, cartId: cartA, email: `a-${base.email}` }),
      placeOrder({ ...base, cartId: cartB, email: `b-${base.email}` }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const [variant] = await db.select().from(productVariant).where(eq(productVariant.id, variantId));
    expect(variant?.stockQty).toBe(0);
    await db.delete(customerOrder).where(eq(customerOrder.email, `a-${base.email}`));
    await db.delete(customerOrder).where(eq(customerOrder.email, `b-${base.email}`));
  });

  it("hides another customer's order", async () => {
    const ownerId = newId();
    const otherId = newId();
    createdUserIds.push(ownerId, otherId);
    await db.insert(user).values([
      { id: ownerId, name: "صاحبة", email: `owner-${ownerId}@example.com`, emailVerified: false, role: "user" },
      { id: otherId, name: "أخرى", email: `other-${otherId}@example.com`, emailVerified: false, role: "user" },
    ]);
    const orderId = newId();
    const number = `TEST-${orderId.slice(0, 8)}`;
    await db.insert(customerOrder).values({
      id: orderId,
      number,
      publicToken: newId(),
      userId: ownerId,
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      recipientName: "صاحبة",
      phone: "0500000000",
      email: `owner-${ownerId}@example.com`,
      city: "الرياض",
      area: "النخيل",
      street: "شارع ١",
      deliveryZoneName: "داخل المدينة",
      currency: "SAR",
      subtotalMinor: 1000,
      discountMinor: 0,
      deliveryFeeMinor: 0,
      totalMinor: 1000,
    });
    expect(await getOwnOrder(otherId, number)).toBeNull();
    expect((await getOwnOrder(ownerId, number))?.id).toBe(orderId);
    await db.delete(customerOrder).where(eq(customerOrder.id, orderId));
  });

  it("does not claim a guest order until the email is verified", async () => {
    const email = `claim-${newId()}@example.com`;
    const orderId = newId();
    createdOrderIds.push(orderId);
    await db.insert(customerOrder).values({
      id: orderId,
      number: `C-${orderId.slice(0, 8)}`,
      publicToken: newId(),
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      recipientName: "ضيفة",
      phone: "0500000000",
      email,
      city: "الرياض",
      area: "النخيل",
      street: "شارع ١",
      deliveryZoneName: "داخل المدينة",
      currency: "SAR",
      subtotalMinor: 1000,
      discountMinor: 0,
      deliveryFeeMinor: 0,
      totalMinor: 1000,
    });
    await auth.api.signUpEmail({
      body: { name: "غير مؤكدة", email, password: "password123" },
    });
    const [signedUp] = await db.select().from(user).where(eq(user.email, email)).limit(1);
    expect(signedUp).toBeTruthy();
    createdUserIds.push(signedUp!.id);
    const [before] = await db.select().from(customerOrder).where(eq(customerOrder.id, orderId));
    expect(before?.userId).toBeNull();

    const url = takeDevVerificationUrl(email);
    expect(url).toBeTruthy();
    const token = new URL(url!).searchParams.get("token");
    expect(token).toBeTruthy();
    await auth.api.verifyEmail({ query: { token: token! } });
    const [after] = await db.select().from(customerOrder).where(eq(customerOrder.id, orderId));
    expect(after?.userId).toBe(signedUp!.id);
    await claimUserCommerce(signedUp!.id);
    const [still] = await db.select().from(customerOrder).where(eq(customerOrder.id, orderId));
    expect(still?.userId).toBe(signedUp!.id);
  });

  it("does not let a profile update grant admin", async () => {
    const email = `profile-${newId()}@example.com`;
    await auth.api.signUpEmail({
      body: { name: "زبونة", email, password: "password123" },
    });
    const [accountUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);
    createdUserIds.push(accountUser!.id);
    const signedIn = await auth.api.signInEmail({
      body: { email, password: "password123" },
    });
    let rejected = false;
    try {
      await auth.api.updateUser({
        body: { name: "زبونة", role: "admin" } as { name: string },
        headers: new Headers({
          cookie: `better-auth.session_token=${signedIn.token}`,
        }),
      });
    } catch {
      rejected = true;
    }
    const [after] = await db.select({ role: user.role }).from(user).where(eq(user.id, accountUser!.id));
    expect(after?.role === "admin").toBe(false);
    expect(after?.role === "user" || rejected).toBe(true);
  });

  it("does not let one customer change another customer's address", async () => {
    const ownerId = newId();
    const otherId = newId();
    createdUserIds.push(ownerId, otherId);
    await db.insert(user).values([
      { id: ownerId, name: "صاحبة", email: `addr-${ownerId}@example.com`, emailVerified: true, role: "user" },
      { id: otherId, name: "أخرى", email: `addr-${otherId}@example.com`, emailVerified: true, role: "user" },
    ]);
    const addressId = newId();
    await db.insert(address).values({
      id: addressId,
      userId: ownerId,
      recipientName: "الأصل",
      phone: "050",
      city: "الرياض",
      area: "النخيل",
      street: "١",
    });
    const changed = await updateOwnAddress(otherId, addressId, {
      recipientName: "مسروق",
      phone: "051",
      city: "جدة",
      area: "السلامة",
      street: "٢",
      notes: null,
      isDefault: false,
    });
    expect(changed).toBe(false);
    expect(await deleteOwnAddress(otherId, addressId)).toBe(false);
    const [row] = await db.select().from(address).where(eq(address.id, addressId));
    expect(row?.recipientName).toBe("الأصل");
    expect(row?.userId).toBe(ownerId);
  });

  it("ignores a second checkout with the same idempotency key", async () => {
    const [zone] = await db.select().from(deliveryZone).limit(1);
    const productId = newId();
    const variantId = newId();
    createdProductIds.push(productId);
    await db.insert(product).values({
      id: productId,
      name: "اختبار التكرار",
      slug: `repeat-${productId}`,
      description: "",
      isPublished: true,
    });
    await db.insert(productVariant).values({
      id: variantId,
      productId,
      sku: `REP-${variantId.slice(0, 8)}`,
      priceMinor: 2000,
      stockQty: 4,
      isActive: true,
    });
    const cartId = newId();
    await db.insert(cart).values({ id: cartId, token: newId() });
    await db.insert(cartItem).values({ id: newId(), cartId, variantId, qty: 1 });
    const key = newId();
    const base = {
      cartId,
      userId: null,
      recipientName: "تكرار",
      phone: "0500000000",
      email: `repeat-${newId()}@example.com`,
      city: "الرياض",
      area: "النخيل",
      street: "شارع ١",
      notes: "",
      deliveryZoneId: zone!.id,
      discountCode: "",
      paymentMethod: "cod" as const,
      idempotencyKey: key,
      saveAddress: false,
    };
    const first = await placeOrder(base);
    const second = await placeOrder({ ...base, recipientName: "محاولة ثانية" });
    expect(second.id).toBe(first.id);
    expect(second.totalMinor).toBe(2000 + 1500);
    const [variant] = await db.select().from(productVariant).where(eq(productVariant.id, variantId));
    expect(variant?.stockQty).toBe(3);
    const orders = await db.select().from(customerOrder).where(eq(customerOrder.idempotencyKey, key));
    expect(orders).toHaveLength(1);
  });

  it("rolls back a failed checkout without changing stock", async () => {
    const productId = newId();
    const variantId = newId();
    createdProductIds.push(productId);
    await db.insert(product).values({
      id: productId,
      name: "اختبار الفشل",
      slug: `fail-${productId}`,
      description: "",
      isPublished: true,
    });
    await db.insert(productVariant).values({
      id: variantId,
      productId,
      sku: `FAIL-${variantId.slice(0, 8)}`,
      priceMinor: 1000,
      stockQty: 3,
      isActive: true,
    });
    const cartId = newId();
    await db.insert(cart).values({ id: cartId, token: newId() });
    await db.insert(cartItem).values({ id: newId(), cartId, variantId, qty: 1 });
    const email = `fail-${newId()}@example.com`;
    await expect(
      placeOrder({
        cartId,
        userId: null,
        recipientName: "فشل",
        phone: "050",
        email,
        city: "الرياض",
        area: "النخيل",
        street: "١",
        notes: "",
        deliveryZoneId: "missing-zone",
        discountCode: "",
        paymentMethod: "cod",
        saveAddress: false,
      }),
    ).rejects.toThrow("منطقة التوصيل غير متاحة");
    const [variant] = await db.select().from(productVariant).where(eq(productVariant.id, variantId));
    expect(variant?.stockQty).toBe(3);
    const orders = await db.select().from(customerOrder).where(eq(customerOrder.email, email));
    expect(orders).toHaveLength(0);
  });

  it("restocks only once when cancellation is repeated", async () => {
    const [zone] = await db.select().from(deliveryZone).limit(1);
    const productId = newId();
    const variantId = newId();
    createdProductIds.push(productId);
    await db.insert(product).values({
      id: productId,
      name: "اختبار الإلغاء",
      slug: `cancel-${productId}`,
      description: "",
      isPublished: true,
    });
    await db.insert(productVariant).values({
      id: variantId,
      productId,
      sku: `CAN-${variantId.slice(0, 8)}`,
      priceMinor: 1000,
      stockQty: 5,
      isActive: true,
    });
    const cartId = newId();
    await db.insert(cart).values({ id: cartId, token: newId() });
    await db.insert(cartItem).values({ id: newId(), cartId, variantId, qty: 2 });
    const actor = await actingAdmin();
    const placed = await placeOrder({
      cartId,
      userId: null,
      recipientName: "إلغاء",
      phone: "050",
      email: `cancel-${newId()}@example.com`,
      city: "الرياض",
      area: "النخيل",
      street: "١",
      notes: "",
      deliveryZoneId: zone!.id,
      discountCode: "",
      paymentMethod: "bank_transfer",
      saveAddress: false,
    });
    await transitionOrder({ ...actor, orderId: placed.id, status: "cancelled" });
    await transitionOrder({ ...actor, orderId: placed.id, status: "cancelled" });
    const [variant] = await db.select().from(productVariant).where(eq(productVariant.id, variantId));
    expect(variant?.stockQty).toBe(5);
  });

  it("excludes unpaid delivery and transfer orders from revenue", async () => {
    const stamp = newId();
    await db.insert(customerOrder).values([
      {
        id: newId(),
        number: `P-${stamp.slice(0, 6)}`,
        publicToken: newId(),
        status: "pending",
        paymentMethod: "cod",
        paymentStatus: "unpaid",
        recipientName: "أ",
        phone: "050",
        email: `rev-${stamp}@example.com`,
        city: "الرياض",
        area: "النخيل",
        street: "١",
        deliveryZoneName: "داخل المدينة",
        currency: "SAR",
        subtotalMinor: 1000,
        discountMinor: 0,
        deliveryFeeMinor: 0,
        totalMinor: 4000,
      },
      {
        id: newId(),
        number: `B-${stamp.slice(0, 6)}`,
        publicToken: newId(),
        status: "pending",
        paymentMethod: "bank_transfer",
        paymentStatus: "awaiting_transfer",
        recipientName: "ب",
        phone: "050",
        email: `rev-${stamp}@example.com`,
        city: "الرياض",
        area: "النخيل",
        street: "١",
        deliveryZoneName: "داخل المدينة",
        currency: "SAR",
        subtotalMinor: 1000,
        discountMinor: 0,
        deliveryFeeMinor: 0,
        totalMinor: 7000,
      },
      {
        id: newId(),
        number: `D-${stamp.slice(0, 6)}`,
        publicToken: newId(),
        status: "confirmed",
        paymentMethod: "cod",
        paymentStatus: "paid",
        recipientName: "ج",
        phone: "050",
        email: `rev-${stamp}@example.com`,
        city: "الرياض",
        area: "النخيل",
        street: "١",
        deliveryZoneName: "داخل المدينة",
        currency: "SAR",
        subtotalMinor: 1000,
        discountMinor: 0,
        deliveryFeeMinor: 0,
        totalMinor: 2500,
      },
    ]);
    const summary = await salesSummary();
    const paidRows = await db
      .select({ total: customerOrder.totalMinor })
      .from(customerOrder)
      .where(eq(customerOrder.paymentStatus, "paid"));
    const expected = paidRows
      .filter(() => true)
      .reduce((sum, row) => sum + row.total, 0);
    const cancelledPaid = await db
      .select({ total: customerOrder.totalMinor, status: customerOrder.status })
      .from(customerOrder)
      .where(eq(customerOrder.paymentStatus, "paid"));
    const paidOpen = cancelledPaid
      .filter((row) => row.status !== "cancelled")
      .reduce((sum, row) => sum + row.total, 0);
    expect(summary.totals?.revenueMinor).toBe(paidOpen);
    expect(summary.totals?.revenueMinor).not.toBe(expected + 4000 + 7000);
    expect(paidOpen).toBeGreaterThanOrEqual(2500);
  });

  it("keeps the order snapshot when a sold product cannot be removed", async () => {
    const productId = newId();
    const variantId = newId();
    const orderId = newId();
    createdProductIds.push(productId);
    createdOrderIds.push(orderId);
    await db.insert(product).values({
      id: productId,
      name: "منتج مباع",
      slug: `sold-${productId}`,
      description: "",
      isPublished: true,
    });
    await db.insert(productVariant).values({
      id: variantId,
      productId,
      sku: `SOLD-${variantId.slice(0, 8)}`,
      priceMinor: 1500,
      stockQty: 1,
      isActive: true,
    });
    await db.insert(customerOrder).values({
      id: orderId,
      number: `S-${orderId.slice(0, 8)}`,
      publicToken: newId(),
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      recipientName: "مباع",
      phone: "050",
      email: `sold-${newId()}@example.com`,
      city: "الرياض",
      area: "النخيل",
      street: "١",
      deliveryZoneName: "داخل المدينة",
      currency: "SAR",
      subtotalMinor: 1500,
      discountMinor: 0,
      deliveryFeeMinor: 0,
      totalMinor: 1500,
    });
    await db.insert(orderItem).values({
      id: newId(),
      orderId,
      variantId,
      productName: "منتج مباع",
      variantLabel: "افتراضي",
      sku: `SOLD-${variantId.slice(0, 8)}`,
      unitPriceMinor: 1500,
      qty: 1,
      lineTotalMinor: 1500,
    });
    await expect(db.delete(product).where(eq(product.id, productId))).rejects.toThrow();
    const [item] = await db.select().from(orderItem).where(eq(orderItem.orderId, orderId));
    expect(item?.productName).toBe("منتج مباع");
    expect(item?.sku).toBe(`SOLD-${variantId.slice(0, 8)}`);
    expect(item?.unitPriceMinor).toBe(1500);
  });

  it("does not return a password from customer management", async () => {
    const id = newId();
    createdUserIds.push(id);
    await db.insert(user).values({
      id,
      name: "بدون سر",
      email: `secret-${id}@example.com`,
      emailVerified: false,
      role: "user",
    });
    const customer = await getCustomer(id);
    expect(customer?.user).toBeTruthy();
    expect(customer?.user).not.toHaveProperty("password");
    expect(JSON.stringify(customer)).not.toMatch(/password|accessToken|refreshToken/);
  });

  it("pages the catalog instead of loading every product", async () => {
    const ids = [newId(), newId(), newId()];
    createdProductIds.push(...ids);
    await db.insert(product).values(
      ids.map((id, index) => ({
        id,
        name: `صفحة ${index}`,
        slug: `page-${id}`,
        description: "",
        isPublished: true,
      })),
    );
    const page = await listProducts({
      publishedOnly: true,
      offset: 0,
      limit: 2,
    });
    expect(page.cards.length).toBeLessThanOrEqual(2);
    expect(page.total).toBeGreaterThanOrEqual(3);
  });

  it("orders new arrivals by creation time and keeps the catalog sort", async () => {
    const older = newId();
    const newer = newId();
    createdProductIds.push(older, newer);
    await db.insert(product).values([
      {
        id: older,
        name: "ترتيب قديم",
        slug: `old-${older}`,
        description: "",
        isPublished: true,
        sortOrder: 20,
        createdAt: new Date("2020-01-01T00:00:00Z"),
      },
      {
        id: newer,
        name: "ترتيب جديد",
        slug: `new-${newer}`,
        description: "",
        isPublished: true,
        sortOrder: 0,
        createdAt: new Date("2024-06-01T00:00:00Z"),
      },
    ]);
    const catalog = await listProducts({ publishedOnly: true, offset: 0, limit: 200 });
    const newestPage = await listProducts({ publishedOnly: true, newest: true, offset: 0, limit: 200 });
    const catalogOlder = catalog.cards.findIndex((card) => card.id === older);
    const catalogNewer = catalog.cards.findIndex((card) => card.id === newer);
    const newestOlder = newestPage.cards.findIndex((card) => card.id === older);
    const newestNewer = newestPage.cards.findIndex((card) => card.id === newer);
    expect(catalogOlder).toBeGreaterThanOrEqual(0);
    expect(catalogNewer).toBeGreaterThan(catalogOlder);
    expect(newestNewer).toBeGreaterThanOrEqual(0);
    expect(newestNewer).toBeLessThan(newestOlder);
  });

  it("records a received bank transfer once and leaves a delivery update unpaid", async () => {
    const customerId = newId();
    const adminId = newId();
    createdUserIds.push(customerId, adminId);
    await db.insert(user).values([
      {
        id: customerId,
        name: "زبونة",
        email: `cust-${customerId}@example.com`,
        role: "user",
      },
      {
        id: adminId,
        name: "مديرة",
        email: `admin-${adminId}@example.com`,
        role: "admin",
      },
    ]);
    const paidId = newId();
    const shipId = newId();
    const base = {
      recipientName: "دفع",
      phone: "050",
      city: "الرياض",
      area: "النخيل",
      street: "١",
      deliveryZoneName: "داخل المدينة",
      currency: "SAR",
      discountMinor: 0,
      deliveryFeeMinor: 0,
      status: "pending",
    };
    await db.insert(customerOrder).values([
      {
        ...base,
        id: paidId,
        number: `T-${paidId.slice(0, 8)}`,
        publicToken: newId(),
        paymentMethod: "bank_transfer",
        paymentStatus: "awaiting_transfer",
        email: `pay-${paidId}@example.com`,
        subtotalMinor: 3200,
        totalMinor: 3200,
      },
      {
        ...base,
        id: shipId,
        number: `S-${shipId.slice(0, 8)}`,
        publicToken: newId(),
        paymentMethod: "cod",
        paymentStatus: "unpaid",
        email: `ship-${shipId}@example.com`,
        subtotalMinor: 1800,
        totalMinor: 1800,
      },
    ]);

    await expect(
      recordPaymentReceived({
        actorId: customerId,
        actorRole: "user",
        orderId: paidId,
        confirmed: true,
      }),
    ).rejects.toThrow("FORBIDDEN");
    const [blocked] = await db.select().from(customerOrder).where(eq(customerOrder.id, paidId));
    expect(blocked?.paymentStatus).toBe("awaiting_transfer");
    expect(blocked?.paidAt).toBeNull();

    const before = (await salesSummary()).totals?.revenueMinor ?? 0;
    const first = await recordPaymentReceived({
      actorId: adminId,
      actorRole: "admin",
      orderId: paidId,
      confirmed: true,
    });
    expect(first.alreadyPaid).toBe(false);
    const [paid] = await db.select().from(customerOrder).where(eq(customerOrder.id, paidId));
    expect(paid?.paymentStatus).toBe("paid");
    expect(paid?.status).toBe("pending");
    expect(paid?.paidByUserId).toBe(adminId);
    expect(paid?.paidAt).toBeInstanceOf(Date);
    const after = (await salesSummary()).totals?.revenueMinor ?? 0;
    expect(after - before).toBe(3200);

    const second = await recordPaymentReceived({
      actorId: adminId,
      actorRole: "admin",
      orderId: paidId,
      confirmed: true,
    });
    expect(second.alreadyPaid).toBe(true);
    const [again] = await db.select().from(customerOrder).where(eq(customerOrder.id, paidId));
    expect(again?.paidAt?.toISOString()).toBe(paid?.paidAt?.toISOString());
    expect((await salesSummary()).totals?.revenueMinor ?? 0).toBe(after);

    const shipActor = await actingAdmin();
    await transitionOrder({ ...shipActor, orderId: shipId, status: "confirmed" });
    const [shipped] = await db.select().from(customerOrder).where(eq(customerOrder.id, shipId));
    expect(shipped?.status).toBe("confirmed");
    expect(shipped?.paymentStatus).toBe("unpaid");
    expect(shipped?.paidAt).toBeNull();
    expect(shipped?.paidByUserId).toBeNull();

    await db.delete(customerOrder).where(inArray(customerOrder.id, [paidId, shipId]));
  });

  it("walks a cash order to delivery without recording payment, then blocks illegal cancels", async () => {
    const actor = await actingAdmin();
    const customerId = newId();
    createdUserIds.push(customerId);
    await db.insert(user).values({
      id: customerId,
      name: "زبونة التوصيل",
      email: `flow-${customerId}@example.com`,
      role: "user",
    });
    const productId = newId();
    const variantId = newId();
    createdProductIds.push(productId);
    await db.insert(product).values({
      id: productId,
      name: "رحلة الإدارة",
      slug: `ops-${productId}`,
      description: "",
      isPublished: true,
    });
    await db.insert(productVariant).values({
      id: variantId,
      productId,
      sku: `OPS-${variantId.slice(0, 8)}`,
      shadeName: "وردي",
      priceMinor: 2000,
      stockQty: 4,
      isActive: true,
    });
    const [zone] = await db.select().from(deliveryZone).limit(1);
    const cartId = newId();
    await db.insert(cart).values({ id: cartId, token: newId(), userId: customerId });
    await db.insert(cartItem).values({ id: newId(), cartId, variantId, qty: 1 });
    const placed = await placeOrder({
      cartId,
      userId: customerId,
      recipientName: "زبونة التوصيل",
      phone: "0550000001",
      email: `flow-${customerId}@example.com`,
      city: "الرياض",
      area: "النخيل",
      street: "شارع الإدارة",
      notes: "ملاحظة الزبونة",
      deliveryZoneId: zone!.id,
      discountCode: "",
      paymentMethod: "cod",
      saveAddress: false,
    });
    createdOrderIds.push(placed.id);

    await expect(transitionOrder({ ...actor, orderId: placed.id, status: "delivered" })).rejects.toThrow(
      "لا يمكن نقل الطلب إلى هذه الحالة.",
    );
    for (const status of ["confirmed", "shipped", "delivered"] as const) {
      await transitionOrder({ ...actor, orderId: placed.id, status });
    }
    const [delivered] = await db.select().from(customerOrder).where(eq(customerOrder.id, placed.id));
    expect(delivered?.status).toBe("delivered");
    expect(delivered?.paymentStatus).toBe("unpaid");
    expect(delivered?.paidAt).toBeNull();
    expect(delivered?.subtotalMinor).toBe(2000);
    const events = await db.select().from(orderEvent).where(eq(orderEvent.orderId, placed.id));
    expect(events.filter((event) => event.kind === "status")).toHaveLength(3);
    expect(events.every((event) => event.actorUserId === actor.actorId)).toBe(true);

    const beforePay = (await salesSummary()).totals?.revenueMinor ?? 0;
    await recordPaymentReceived({
      actorId: actor.actorId,
      actorRole: "admin",
      orderId: placed.id,
      confirmed: true,
    });
    const afterPay = (await salesSummary()).totals?.revenueMinor ?? 0;
    expect(afterPay - beforePay).toBe(placed.totalMinor);
    await recordPaymentReceived({
      actorId: actor.actorId,
      actorRole: "admin",
      orderId: placed.id,
      confirmed: true,
    });
    expect((await salesSummary()).totals?.revenueMinor ?? 0).toBe(afterPay);
    const [paid] = await db.select().from(customerOrder).where(eq(customerOrder.id, placed.id));
    expect(paid?.status).toBe("delivered");

    await expect(transitionOrder({ ...actor, orderId: placed.id, status: "cancelled" })).rejects.toThrow(
      "لا يمكن إلغاء طلب تم تسليمه.",
    );
    const [stillDelivered] = await db.select().from(productVariant).where(eq(productVariant.id, variantId));
    expect(stillDelivered?.stockQty).toBe(3);

    const paidOpenId = newId();
    await db.insert(customerOrder).values({
      id: paidOpenId,
      number: `PAID-${paidOpenId.slice(0, 8)}`,
      publicToken: newId(),
      status: "confirmed",
      paymentMethod: "cod",
      paymentStatus: "paid",
      paidAt: new Date(),
      paidByUserId: actor.actorId,
      recipientName: "مدفوعة",
      phone: "055",
      email: `paid-${paidOpenId}@example.com`,
      city: "الرياض",
      area: "النخيل",
      street: "١",
      deliveryZoneName: "داخل المدينة",
      currency: "SAR",
      subtotalMinor: 500,
      discountMinor: 0,
      deliveryFeeMinor: 0,
      totalMinor: 500,
    });
    await expect(transitionOrder({ ...actor, orderId: paidOpenId, status: "cancelled" })).rejects.toThrow(
      "إعادة المبلغ تتم يدوياً",
    );
    const [paidOpen] = await db.select().from(customerOrder).where(eq(customerOrder.id, paidOpenId));
    expect(paidOpen?.status).toBe("confirmed");
    expect(paidOpen?.paymentStatus).toBe("paid");

    await expect(
      transitionOrder({ actorId: customerId, actorRole: "user", orderId: placed.id, status: "cancelled" }),
    ).rejects.toThrow("FORBIDDEN");

    await addOrderNote({
      actorId: actor.actorId,
      actorRole: "admin",
      orderId: placed.id,
      body: "ملاحظة داخلية للتجربة",
    });
    const own = await getOwnOrder(customerId, placed.number);
    expect(own?.status).toBe("delivered");
    expect(JSON.stringify(own)).not.toContain("ملاحظة داخلية للتجربة");
    expect(JSON.stringify(own)).not.toContain("مديرة السجل");
    expect(JSON.stringify(own)).not.toContain("paidBy");
    expect(await getOwnOrder(actor.actorId, placed.number)).toBeNull();

    await db.delete(customerOrder).where(inArray(customerOrder.id, [placed.id, paidOpenId]));
  });

  it("finds an order by reference and limits the dashboard to its date", async () => {
    const stamp = newId().slice(0, 8);
    const insideId = newId();
    const outsideId = newId();
    const number = `FIND-${stamp}`;
    const base = {
      publicToken: newId(),
      status: "pending" as const,
      paymentMethod: "cod" as const,
      paymentStatus: "unpaid" as const,
      phone: "055",
      city: "الرياض",
      area: "النخيل",
      street: "١",
      deliveryZoneName: "داخل المدينة",
      currency: "SAR",
      subtotalMinor: 1100,
      discountMinor: 0,
      deliveryFeeMinor: 0,
      totalMinor: 1100,
    };
    await db.insert(customerOrder).values([
      {
        ...base,
        id: insideId,
        number,
        publicToken: newId(),
        recipientName: "وجدان البحث",
        email: `find-${stamp}@example.com`,
        createdAt: new Date("2024-03-15T12:00:00"),
      },
      {
        ...base,
        id: outsideId,
        number: `OLD-${stamp}`,
        recipientName: "خارج الفترة",
        email: `old-${stamp}@example.com`,
        status: "cancelled",
        paymentStatus: "unpaid",
        totalMinor: 9000,
        createdAt: new Date("2020-01-01T12:00:00"),
      },
    ]);
    const found = await listAdminOrders({ q: number }, 0, 20);
    expect(found.rows.map((row) => row.id)).toEqual([insideId]);
    const byName = await listAdminOrders({ q: "وجدان" }, 0, 20);
    expect(byName.rows.some((row) => row.id === insideId)).toBe(true);
    const byEmail = await listAdminOrders({ q: `find-${stamp}@example.com`, paymentStatus: "unpaid", paymentMethod: "cod" }, 0, 20);
    expect(byEmail.rows.some((row) => row.id === insideId)).toBe(true);

    const from = parseOrderDay("2024-03-15", false);
    const to = parseOrderDay("2024-03-15", true);
    const summary = await salesSummary({ from, to });
    const rows = await db
      .select()
      .from(customerOrder)
      .where(and(gte(customerOrder.createdAt, from!), lte(customerOrder.createdAt, to!)));
    expect(rows.some((row) => row.id === insideId)).toBe(true);
    expect(rows.some((row) => row.id === outsideId)).toBe(false);
    expect(summary.totals?.orders).toBe(rows.length);
    expect(summary.totals?.cancelledOrders).toBe(rows.filter((row) => row.status === "cancelled").length);
    expect(summary.totals?.unpaidOrders).toBe(
      rows.filter((row) => row.status !== "cancelled" && (row.paymentStatus === "unpaid" || row.paymentStatus === "awaiting_transfer")).length,
    );
    expect(summary.totals?.revenueMinor).toBe(
      rows
        .filter((row) => row.status !== "cancelled" && row.paymentStatus === "paid")
        .reduce((sum, row) => sum + row.totalMinor, 0),
    );
    expect(summary.recent.some((row) => row.id === outsideId)).toBe(false);

    await db.delete(customerOrder).where(inArray(customerOrder.id, [insideId, outsideId]));
  });

  it("uses the saved zone fee and bank text, and a customer save does not change settings", async () => {
    const [before] = await db.select().from(storeSetting).limit(1);
    expect(before).toBeTruthy();
    const zoneId = newId();
    await db.insert(deliveryZone).values({
      id: zoneId,
      name: "رسوم الاختبار",
      feeMinor: 4321,
      isActive: true,
      sortOrder: 80,
    });
    try {
      await db
        .update(storeSetting)
        .set({ bankInstructions: "تعليمات اختبار التحويل" })
        .where(eq(storeSetting.id, before!.id));
      const [stored] = await db.select().from(storeSetting).where(eq(storeSetting.id, before!.id));
      expect(visibleBankInstructions("bank_transfer", stored?.bankInstructions)).toBe("تعليمات اختبار التحويل");
      expect(visibleBankInstructions("cod", stored?.bankInstructions)).toBeNull();
      const zone = (await listDeliveryZones()).find((item) => item.id === zoneId);
      expect(zone?.feeMinor).toBe(4321);
      expect(
        priceOrder({
          lines: [{ variantId: "fee", unitPriceMinor: 1000, qty: 1 }],
          discount: null,
          deliveryFeeMinor: zone!.feeMinor,
        }).deliveryFeeMinor,
      ).toBe(4321);
      await expect(saveSettingsAction(null, new FormData())).rejects.toThrow();
      const [after] = await db.select({ storeName: storeSetting.storeName }).from(storeSetting).where(eq(storeSetting.id, before!.id));
      expect(after?.storeName).toBe(before!.storeName);
    } finally {
      await db
        .update(storeSetting)
        .set({ bankInstructions: before!.bankInstructions })
        .where(eq(storeSetting.id, before!.id));
      await db.delete(deliveryZone).where(eq(deliveryZone.id, zoneId));
    }
  });
});
