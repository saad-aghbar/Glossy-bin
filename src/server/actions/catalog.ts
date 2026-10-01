"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { brand, category, product, productImage, productVariant, stockMovement } from "@/db/schema";
import { assertCanAdmin } from "@/lib/access";
import { actionError, field, flag, isNextRedirect, type ActionState } from "@/lib/form";
import { newId } from "@/lib/ids";
import { majorToMinor } from "@/lib/money";
import { requireAdmin } from "@/lib/session";
import { deleteStoredImage, saveProductImage } from "@/lib/storage";
import { isForeignKeyViolation, isUniqueViolation, slugify } from "@/lib/text";
import { getSettings } from "@/server/queries";

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");
}

async function uniqueSlug(
  table: typeof product | typeof category | typeof brand,
  name: string,
  currentId?: string,
) {
  const base = slugify(name);
  for (let index = 0; index < 50; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const [existing] = await db.select({ id: table.id }).from(table).where(eq(table.slug, slug)).limit(1);
    if (!existing || existing.id === currentId) return slug;
  }
  return `${base}-${newId().slice(0, 8)}`;
}

export type CatalogVariantInput = {
  id: string;
  isNew: boolean;
  sku: string;
  shadeName: string | null;
  sizeName: string | null;
  priceMinor: number;
  compareAtPriceMinor: number | null;
  stockQty: number;
  loadedStock: number | null;
  isActive: boolean;
};

export async function persistProduct(input: {
  id: string;
  isNew: boolean;
  name: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  variants: CatalogVariantInput[];
}) {
  if (input.variants.length === 0) throw new Error("أضيفي خياراً واحداً على الأقل");
  if (new Set(input.variants.map((item) => item.sku)).size !== input.variants.length) {
    throw new Error("رمز SKU مكرر في هذا المنتج");
  }
  const slug = await uniqueSlug(product, input.name, input.isNew ? undefined : input.id);
  await db.transaction(async (tx) => {
    if (input.isNew) {
      await tx.insert(product).values({
        id: input.id,
        name: input.name,
        slug,
        description: input.description,
        categoryId: input.categoryId,
        brandId: input.brandId,
        isFeatured: input.isFeatured,
        isPublished: input.isPublished,
        sortOrder: input.sortOrder,
      });
    } else {
      await tx
        .update(product)
        .set({
          name: input.name,
          slug,
          description: input.description,
          categoryId: input.categoryId,
          brandId: input.brandId,
          isFeatured: input.isFeatured,
          isPublished: input.isPublished,
          ...(input.isPublished ? { archivedAt: null } : {}),
          sortOrder: input.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(product.id, input.id));
    }

    const existing = await tx.select().from(productVariant).where(eq(productVariant.productId, input.id));
    const kept = new Set(input.variants.filter((item) => !item.isNew).map((item) => item.id));
    for (const row of existing) {
      if (kept.has(row.id)) continue;
      await tx.delete(productVariant).where(eq(productVariant.id, row.id));
    }

    for (const item of input.variants) {
      const previous = existing.find((row) => row.id === item.id);
      if (previous) {
        const [locked] = await tx
          .select()
          .from(productVariant)
          .where(and(eq(productVariant.id, item.id), eq(productVariant.productId, input.id)))
          .for("update")
          .limit(1);
        if (!locked) throw new Error("الخيار غير موجود");
        const unchanged = item.loadedStock === null || item.stockQty === item.loadedStock;
        const nextStock = unchanged ? locked.stockQty : locked.stockQty + (item.stockQty - item.loadedStock!);
        if (!Number.isInteger(nextStock) || nextStock < 0) throw new Error("الكمية غير صالحة");
        await tx
          .update(productVariant)
          .set({
            sku: item.sku,
            shadeName: item.shadeName,
            sizeName: item.sizeName,
            priceMinor: item.priceMinor,
            compareAtPriceMinor: item.compareAtPriceMinor,
            stockQty: nextStock,
            isActive: item.isActive,
            updatedAt: new Date(),
          })
          .where(and(eq(productVariant.id, item.id), eq(productVariant.productId, input.id)));
        const delta = nextStock - locked.stockQty;
        if (delta !== 0) {
          await tx.insert(stockMovement).values({
            id: newId(),
            variantId: item.id,
            delta,
            reason: "adjustment",
          });
        }
      } else {
        await tx.insert(productVariant).values({
          id: item.id,
          productId: input.id,
          sku: item.sku,
          shadeName: item.shadeName,
          sizeName: item.sizeName,
          priceMinor: item.priceMinor,
          compareAtPriceMinor: item.compareAtPriceMinor,
          stockQty: item.stockQty,
          isActive: item.isActive,
        });
        if (item.stockQty !== 0) {
          await tx.insert(stockMovement).values({
            id: newId(),
            variantId: item.id,
            delta: item.stockQty,
            reason: "adjustment",
          });
        }
      }
    }
  });
}

export async function setProductVisibility(id: string, visibility: "draft" | "published" | "archived") {
  await db
    .update(product)
    .set({
      isPublished: visibility === "published",
      archivedAt: visibility === "archived" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(product.id, id));
}

export async function saveProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  assertCanAdmin(actor.role);
  const settings = await getSettings();
  if (!settings) return { error: "أضيفي إعدادات المتجر أولاً" };

  const id = field(formData, "id") || newId();
  const isNew = !field(formData, "id");
  const name = field(formData, "name");
  const description = field(formData, "description");
  if (name.length < 2) return { error: "اسم المنتج مطلوب" };

  const ids = formData.getAll("variantId").map((value) => String(value));
  const skus = formData.getAll("variantSku").map((value) => String(value).trim());
  const shades = formData.getAll("variantShade").map((value) => String(value).trim());
  const sizes = formData.getAll("variantSize").map((value) => String(value).trim());
  const prices = formData.getAll("variantPrice").map((value) => String(value).trim());
  const compares = formData.getAll("variantCompare").map((value) => String(value).trim());
  const stocks = formData.getAll("variantStock").map((value) => String(value).trim());
  const loadedStocks = formData.getAll("variantStockLoaded").map((value) => String(value).trim());
  const actives = formData.getAll("variantActive").map((value) => String(value));
  if (
    skus.length === 0 ||
    new Set([ids.length, skus.length, shades.length, sizes.length, prices.length, compares.length, stocks.length, loadedStocks.length, actives.length]).size !== 1
  ) {
    return { error: "أضيفي خياراً واحداً على الأقل" };
  }

  try {
    const variants = skus.map((sku, index) => {
      if (!sku) throw new Error("رمز SKU مطلوب");
      const stockQty = Number.parseInt(stocks[index] || "0", 10);
      if (!Number.isInteger(stockQty) || stockQty < 0) throw new Error("الكمية غير صالحة");
      const loadedRaw = loadedStocks[index] ?? "";
      const loadedStock = loadedRaw === "" ? null : Number.parseInt(loadedRaw, 10);
      if (loadedStock !== null && !Number.isInteger(loadedStock)) throw new Error("الكمية غير صالحة");
      const priceMinor = majorToMinor(prices[index] || "", settings.minorUnit);
      const compareRaw = compares[index];
      const compareAtPriceMinor = compareRaw ? majorToMinor(compareRaw, settings.minorUnit) : null;
      return {
        id: ids[index] || newId(),
        isNew: !ids[index],
        sku,
        shadeName: shades[index] || null,
        sizeName: sizes[index] || null,
        priceMinor,
        compareAtPriceMinor,
        stockQty,
        loadedStock,
        isActive: actives[index] !== "0",
      };
    });
    if (new Set(variants.map((item) => item.sku)).size !== variants.length) {
      throw new Error("رمز SKU مكرر في هذا المنتج");
    }
    await persistProduct({
      id,
      isNew,
      name,
      description,
      categoryId: field(formData, "categoryId") || null,
      brandId: field(formData, "brandId") || null,
      isFeatured: flag(formData, "isFeatured"),
      isPublished: flag(formData, "isPublished"),
      sortOrder: Number.parseInt(field(formData, "sortOrder") || "0", 10) || 0,
      variants,
    });
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    if (isUniqueViolation(error)) return { error: "رمز SKU أو الرابط مستخدم مسبقاً" };
    if (isForeignKeyViolation(error)) return { error: "لا يمكن حذف خيار تم بيعه. عطّليه بدل ذلك." };
    return { error: actionError(error, "تعذر حفظ المنتج") };
  }

  revalidateCatalog();
  redirect(`/admin/products/${id}`);
}

export async function setProductVisibilityAction(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "id");
  const visibility = field(formData, "visibility");
  if (visibility === "archived" && formData.get("confirmArchive") !== "yes") {
    redirect(`/admin/products/${id}?error=confirm`);
  }
  if (visibility !== "draft" && visibility !== "published" && visibility !== "archived") {
    redirect(`/admin/products/${id}?error=state`);
  }
  await setProductVisibility(id, visibility);
  revalidateCatalog();
  redirect(`/admin/products/${id}`);
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "id");
  if (formData.get("confirmDelete") !== "yes") {
    redirect("/admin/products?error=confirm");
  }
  try {
    await db.delete(product).where(eq(product.id, id));
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      redirect("/admin/products?error=sold");
    }
    throw error;
  }
  revalidateCatalog();
  redirect("/admin/products");
}

export async function uploadImageAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const productId = field(formData, "productId");
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "اختاري صورة" };
  try {
    const url = await saveProductImage(file);
    const [last] = await db
      .select({ sortOrder: productImage.sortOrder })
      .from(productImage)
      .where(eq(productImage.productId, productId))
      .orderBy(desc(productImage.sortOrder))
      .limit(1);
    await db.insert(productImage).values({
      id: newId(),
      productId,
      variantId: field(formData, "variantId") || null,
      url,
      alt: field(formData, "alt") || field(formData, "productName"),
      sortOrder: (last?.sortOrder ?? 0) + 1,
    });
  } catch (error) {
    return { error: actionError(error, "تعذر رفع الصورة") };
  }
  revalidateCatalog();
  return { ok: "تم رفع الصورة" };
}

export async function deleteImageAction(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "id");
  const [image] = await db.select().from(productImage).where(eq(productImage.id, id)).limit(1);
  if (!image) return;
  if (formData.get("confirmDelete") !== "yes") {
    redirect(`/admin/products/${image.productId}?error=confirm`);
  }
  await db.delete(productImage).where(eq(productImage.id, id));
  await deleteStoredImage(image.url);
  revalidateCatalog();
  redirect(`/admin/products/${image.productId}`);
}

async function orderedImages(productId: string) {
  return db
    .select()
    .from(productImage)
    .where(eq(productImage.productId, productId))
    .orderBy(asc(productImage.sortOrder), asc(productImage.createdAt));
}

export async function chooseMainImage(imageId: string) {
  const [image] = await db.select().from(productImage).where(eq(productImage.id, imageId)).limit(1);
  if (!image) return;
  const images = await orderedImages(image.productId);
  const ordered = [image, ...images.filter((item) => item.id !== image.id)];
  await db.transaction(async (tx) => {
    for (const [index, item] of ordered.entries()) {
      await tx.update(productImage).set({ sortOrder: index }).where(eq(productImage.id, item.id));
    }
  });
}

export async function chooseMainImageAction(formData: FormData) {
  await requireAdmin();
  await chooseMainImage(field(formData, "id"));
  revalidateCatalog();
  const [image] = await db.select().from(productImage).where(eq(productImage.id, field(formData, "id"))).limit(1);
  if (image) redirect(`/admin/products/${image.productId}`);
}

export async function moveProductImage(imageId: string, direction: "earlier" | "later") {
  const [image] = await db.select().from(productImage).where(eq(productImage.id, imageId)).limit(1);
  if (!image) return;
  const images = await orderedImages(image.productId);
  const index = images.findIndex((item) => item.id === image.id);
  const swapIndex = direction === "earlier" ? index - 1 : index + 1;
  if (!images[swapIndex] || index < 0) return;
  const next = [...images];
  const [moved] = next.splice(index, 1);
  next.splice(swapIndex, 0, moved);
  await db.transaction(async (tx) => {
    for (const [order, item] of next.entries()) {
      await tx.update(productImage).set({ sortOrder: order }).where(eq(productImage.id, item.id));
    }
  });
}

export async function moveImageAction(formData: FormData) {
  await requireAdmin();
  const direction = field(formData, "direction") === "later" ? "later" : "earlier";
  const id = field(formData, "id");
  const [image] = await db.select().from(productImage).where(eq(productImage.id, id)).limit(1);
  await moveProductImage(id, direction);
  revalidateCatalog();
  if (image) redirect(`/admin/products/${image.productId}`);
}

export async function saveCategoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = field(formData, "name");
  const id = field(formData, "id");
  if (name.length < 2) return { error: "اسم التصنيف مطلوب" };
  try {
    if (id) {
      await db
        .update(category)
        .set({
          name,
          slug: await uniqueSlug(category, name, id),
          description: field(formData, "description") || null,
          sortOrder: Number.parseInt(field(formData, "sortOrder") || "0", 10) || 0,
          isActive: flag(formData, "isActive"),
          updatedAt: new Date(),
        })
        .where(eq(category.id, id));
    } else {
      await db.insert(category).values({
        id: newId(),
        name,
        slug: await uniqueSlug(category, name),
        description: field(formData, "description") || null,
        sortOrder: Number.parseInt(field(formData, "sortOrder") || "0", 10) || 0,
        isActive: flag(formData, "isActive"),
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "هذا التصنيف موجود" };
    return { error: actionError(error, "تعذر حفظ التصنيف") };
  }
  revalidateCatalog();
  redirect("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  await db.delete(category).where(eq(category.id, field(formData, "id")));
  revalidateCatalog();
  redirect("/admin/categories");
}

export async function saveBrandAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = field(formData, "name");
  const id = field(formData, "id");
  if (name.length < 2) return { error: "اسم العلامة مطلوب" };
  try {
    if (id) {
      await db
        .update(brand)
        .set({
          name,
          slug: await uniqueSlug(brand, name, id),
          sortOrder: Number.parseInt(field(formData, "sortOrder") || "0", 10) || 0,
          isActive: flag(formData, "isActive"),
          updatedAt: new Date(),
        })
        .where(eq(brand.id, id));
    } else {
      await db.insert(brand).values({
        id: newId(),
        name,
        slug: await uniqueSlug(brand, name),
        sortOrder: Number.parseInt(field(formData, "sortOrder") || "0", 10) || 0,
        isActive: flag(formData, "isActive"),
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "هذه العلامة موجودة" };
    return { error: actionError(error, "تعذر حفظ العلامة") };
  }
  revalidateCatalog();
  redirect("/admin/brands");
}

export async function deleteBrandAction(formData: FormData) {
  await requireAdmin();
  await db.delete(brand).where(eq(brand.id, field(formData, "id")));
  revalidateCatalog();
  redirect("/admin/brands");
}
