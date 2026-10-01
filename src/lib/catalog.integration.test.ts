import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { cart, cartItem, customerOrder, deliveryZone, orderItem, product, productImage, productVariant, stockMovement, storeSetting, user } from "@/db/schema";
import { mergeGuestCart } from "@/lib/claim";
import { newId } from "@/lib/ids";
import { CheckoutError, placeOrder } from "@/lib/orders";
import { deleteStoredImage, saveProductImage } from "@/lib/storage";
import { chooseMainImage, persistProduct, setProductVisibility, type CatalogVariantInput } from "@/server/actions/catalog";
import { getProductBySlug, listProducts } from "@/server/queries";

const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

function variant(input: Partial<CatalogVariantInput> & Pick<CatalogVariantInput, "id" | "sku" | "stockQty">): CatalogVariantInput {
  return {
    isNew: input.isNew ?? false,
    shadeName: input.shadeName ?? null,
    sizeName: input.sizeName ?? null,
    priceMinor: input.priceMinor ?? 5000,
    compareAtPriceMinor: input.compareAtPriceMinor ?? null,
    loadedStock: input.loadedStock ?? null,
    isActive: input.isActive ?? true,
    ...input,
  };
}

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
  if (createdOrderIds.length) {
    await db.delete(orderItem).where(inArray(orderItem.orderId, createdOrderIds));
    await db.delete(customerOrder).where(inArray(customerOrder.id, createdOrderIds));
  }
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
    await db.delete(productImage).where(inArray(productImage.productId, createdProductIds));
    await db.delete(product).where(inArray(product.id, createdProductIds));
  }
});

describe("product management", () => {
  it("publishes a draft, keeps concurrent stock, and archives it without rewriting an order", async () => {
    const productId = newId();
    const roseId = newId();
    const berryId = newId();
    createdProductIds.push(productId);
    const roseSku = `ROSE-${roseId.slice(0, 6)}`;
    const berrySku = `BERRY-${berryId.slice(0, 6)}`;
    await persistProduct({
      id: productId,
      isNew: true,
      name: "اختبار الظلال",
      description: "وصف أول",
      categoryId: null,
      brandId: null,
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
      variants: [
        variant({ id: roseId, isNew: true, sku: roseSku, shadeName: "وردي", stockQty: 4 }),
        variant({ id: berryId, isNew: true, sku: berrySku, shadeName: "توتي", stockQty: 2 }),
      ],
    });

    const hidden = await listProducts({ publishedOnly: true, q: "اختبار الظلال", offset: 0, limit: 20 });
    expect(hidden.cards.some((card) => card.id === productId)).toBe(false);

    await setProductVisibility(productId, "published");
    const [stored] = await db.select().from(product).where(eq(product.id, productId));
    const visible = await listProducts({ publishedOnly: true, q: "اختبار الظلال", offset: 0, limit: 20 });
    expect(visible.cards.some((card) => card.id === productId)).toBe(true);
    expect(await getProductBySlug(stored.slug)).toBeTruthy();

    const firstImage = newId();
    const secondImage = newId();
    await db.insert(productImage).values([
      { id: firstImage, productId, url: "/uploads/catalog-first.png", alt: "أولى", sortOrder: 0 },
      { id: secondImage, productId, url: "/uploads/catalog-second.png", alt: "ثانية", sortOrder: 1 },
    ]);
    await chooseMainImage(secondImage);
    const withImage = await listProducts({ publishedOnly: true, q: "اختبار الظلال", offset: 0, limit: 20 });
    expect(withImage.cards.find((card) => card.id === productId)?.imageUrl).toBe("/uploads/catalog-second.png");

    const [zone] = await db.select().from(deliveryZone).limit(1);
    const cartId = newId();
    await db.insert(cart).values({ id: cartId, token: newId() });
    await db.insert(cartItem).values({ id: newId(), cartId, variantId: roseId, qty: 1 });
    const placed = await placeOrder({
      cartId,
      userId: null,
      recipientName: "اختبار",
      phone: "050",
      email: `catalog-${newId()}@example.com`,
      city: "الرياض",
      area: "النخيل",
      street: "١",
      notes: "",
      deliveryZoneId: zone!.id,
      discountCode: "",
      paymentMethod: "cod",
      saveAddress: false,
    });
    createdOrderIds.push(placed.id);

    await db.update(productVariant).set({ stockQty: 3 }).where(eq(productVariant.id, roseId));
    await persistProduct({
      id: productId,
      isNew: false,
      name: "اختبار الظلال المعدّل",
      description: "وصف معدّل",
      categoryId: null,
      brandId: null,
      isFeatured: false,
      isPublished: true,
      sortOrder: 0,
      variants: [
        variant({ id: roseId, sku: roseSku, shadeName: "وردي", stockQty: 4, loadedStock: 4, priceMinor: 8000 }),
        variant({ id: berryId, sku: berrySku, shadeName: "توتي", stockQty: 2, loadedStock: 2 }),
      ],
    });
    const [roseAfterEdit] = await db.select().from(productVariant).where(eq(productVariant.id, roseId));
    const [edited] = await db.select().from(product).where(eq(product.id, productId));
    const [snapshot] = await db.select().from(orderItem).where(eq(orderItem.orderId, placed.id));
    expect(roseAfterEdit?.stockQty).toBe(3);
    expect(edited?.description).toBe("وصف معدّل");
    expect(snapshot?.productName).toBe("اختبار الظلال");
    expect(snapshot?.sku).toBe(roseSku);
    expect(snapshot?.unitPriceMinor).toBe(5000);

    await persistProduct({
      id: productId,
      isNew: false,
      name: "اختبار الظلال المعدّل",
      description: "وصف معدّل",
      categoryId: null,
      brandId: null,
      isFeatured: false,
      isPublished: true,
      sortOrder: 0,
      variants: [
        variant({ id: roseId, sku: roseSku, shadeName: "وردي", stockQty: 3, loadedStock: 3 }),
        variant({ id: berryId, sku: berrySku, shadeName: "توتي", stockQty: 0, loadedStock: 2 }),
      ],
    });
    const [berry] = await db.select().from(productVariant).where(eq(productVariant.id, berryId));
    expect(berry?.stockQty).toBe(0);

    await setProductVisibility(productId, "archived");
    expect(await getProductBySlug(stored.slug)).toBeNull();
    const archivedList = await listProducts({ publishedOnly: true, q: "اختبار الظلال", offset: 0, limit: 20 });
    expect(archivedList.cards.some((card) => card.id === productId)).toBe(false);

    const blockedCart = newId();
    await db.insert(cart).values({ id: blockedCart, token: newId() });
    await db.insert(cartItem).values({ id: newId(), cartId: blockedCart, variantId: roseId, qty: 1 });
    await expect(
      placeOrder({
        cartId: blockedCart,
        userId: null,
        recipientName: "اختبار",
        phone: "050",
        email: `blocked-${newId()}@example.com`,
        city: "الرياض",
        area: "النخيل",
        street: "١",
        notes: "",
        deliveryZoneId: zone!.id,
        discountCode: "",
        paymentMethod: "cod",
        saveAddress: false,
      }),
    ).rejects.toBeInstanceOf(CheckoutError);
  });

  it("saves a simple product without shade or size and rejects a repeated SKU", async () => {
    const productId = newId();
    const variantId = newId();
    createdProductIds.push(productId);
    await persistProduct({
      id: productId,
      isNew: true,
      name: "منتج بسيط",
      description: "",
      categoryId: null,
      brandId: null,
      isFeatured: false,
      isPublished: true,
      sortOrder: 0,
      variants: [variant({ id: variantId, isNew: true, sku: `SIMPLE-${variantId.slice(0, 6)}`, stockQty: 1 })],
    });
    const [row] = await db.select().from(productVariant).where(eq(productVariant.id, variantId));
    expect(row?.shadeName).toBeNull();
    expect(row?.sizeName).toBeNull();
    await expect(
      persistProduct({
        id: productId,
        isNew: false,
        name: "منتج بسيط",
        description: "",
        categoryId: null,
        brandId: null,
        isFeatured: false,
        isPublished: true,
        sortOrder: 0,
        variants: [
          variant({ id: variantId, sku: row!.sku, stockQty: 1, loadedStock: 1 }),
          variant({ id: newId(), isNew: true, sku: row!.sku, stockQty: 1 }),
        ],
      }),
    ).rejects.toThrow("رمز SKU مكرر");
  });

  it("rejects a file that is not a supported image and an oversized upload", async () => {
    const text = new File([new Uint8Array([1, 2, 3, 4])], "notes.txt", { type: "text/plain" });
    await expect(saveProductImage(text)).rejects.toThrow("JPEG");
    const huge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    await expect(saveProductImage(huge)).rejects.toThrow("٥");
  });

  it("stores a real PNG and deletes the file afterward", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const file = new File([png], "dot.png", { type: "image/png" });
    const url = await saveProductImage(file);
    expect(url.startsWith("/uploads/")).toBe(true);
    await deleteStoredImage(url);
  });

  it("caps merged guest quantities at current stock and drops an archived variant", async () => {
    const userId = newId();
    const productId = newId();
    const keepId = newId();
    const goneId = newId();
    createdProductIds.push(productId);
    await db.insert(user).values({
      id: userId,
      name: "دمج",
      email: `merge-${userId}@example.com`,
      emailVerified: true,
      role: "user",
    });
    await db.insert(product).values({
      id: productId,
      name: "دمج السلة",
      slug: `merge-${productId}`,
      description: "",
      isPublished: true,
    });
    await db.insert(productVariant).values([
      {
        id: keepId,
        productId,
        sku: `KEEP-${keepId.slice(0, 6)}`,
        priceMinor: 1000,
        stockQty: 2,
        isActive: true,
      },
      {
        id: goneId,
        productId,
        sku: `GONE-${goneId.slice(0, 6)}`,
        priceMinor: 1000,
        stockQty: 5,
        isActive: false,
      },
    ]);
    const token = newId();
    const guestCart = newId();
    await db.insert(cart).values({ id: guestCart, token });
    await db.insert(cartItem).values([
      { id: newId(), cartId: guestCart, variantId: keepId, qty: 5, priceSeenMinor: 1000 },
      { id: newId(), cartId: guestCart, variantId: goneId, qty: 1, priceSeenMinor: 1000 },
    ]);
    await mergeGuestCart(userId, token);
    const merged = await db.query.cart.findFirst({
      where: eq(cart.userId, userId),
      with: { items: true },
    });
    expect(merged?.items).toHaveLength(1);
    expect(merged?.items[0]?.qty).toBe(2);
    expect(merged?.items[0]?.variantId).toBe(keepId);
    await db.delete(user).where(eq(user.id, userId));
  });

  it("finds a mixed Arabic and English product from its encoded slug", async () => {
    const productId = newId();
    const variantId = newId();
    createdProductIds.push(productId);
    await persistProduct({
      id: productId,
      isNew: true,
      name: "لمسة Glow للاختبار",
      description: "",
      categoryId: null,
      brandId: null,
      isFeatured: false,
      isPublished: true,
      sortOrder: 0,
      variants: [variant({ id: variantId, isNew: true, sku: `MIX-${variantId.slice(0, 6)}`, shadeName: "وردي", stockQty: 1 })],
    });
    const [stored] = await db.select().from(product).where(eq(product.id, productId));
    expect(stored?.slug).toContain("glow");
    expect(await getProductBySlug(encodeURIComponent(stored!.slug))).toMatchObject({ id: productId });
    expect(await getProductBySlug(stored!.slug)).toMatchObject({ id: productId });
  });
});
