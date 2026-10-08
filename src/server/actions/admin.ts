"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  brand,
  category,
  contactMessage,
  contentPage,
  deliveryZone,
  discountCode,
  heroStackImage,
  homeCollageTile,
  homeRibbon,
  offer,
  storeSetting,
  user,
} from "@/db/schema";
import { assertCanAdmin } from "@/lib/access";
import { actionError, field, flag, isNextRedirect, type ActionState } from "@/lib/form";
import { newId } from "@/lib/ids";
import { isOrderStatus } from "@/lib/labels";
import { instagramUrl, offerLink, whatsappUrl } from "@/lib/links";
import { pageBodyError } from "@/lib/content";
import { instantFromJerusalem } from "@/lib/dates";
import { majorToMinor } from "@/lib/money";
import { addOrderNote, recordPaymentReceived, transitionOrder } from "@/lib/orders";
import { requireAdmin } from "@/lib/session";
import { deleteStoredImage, saveProductImage } from "@/lib/storage";
import { isUniqueViolation } from "@/lib/text";
import { getSettings } from "@/server/queries";

async function minorField(formData: FormData, name: string) {
  const settings = await getSettings();
  if (!settings) throw new Error("إعدادات المتجر غير مكتملة");
  return { settings, minor: majorToMinor(field(formData, name) || "0", settings.minorUnit) };
}

function optionalInstant(formData: FormData, name: string) {
  const parts = {
    year: field(formData, `${name}Year`),
    month: field(formData, `${name}Month`),
    day: field(formData, `${name}Day`),
    hour: field(formData, `${name}Hour`),
    minute: field(formData, `${name}Minute`),
  };
  if (!parts.year && !parts.month && !parts.day && !parts.hour && !parts.minute) return null;
  const date = instantFromJerusalem(parts);
  if (!date) throw new Error("التاريخ غير صالح");
  return date;
}

export async function saveOfferAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = field(formData, "title");
  const id = field(formData, "id");
  if (title.length < 2) return { error: "عنوان العرض مطلوب" };
  let imageUrl = field(formData, "existingImage") || null;
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) imageUrl = await saveProductImage(file);
    const values = {
      title,
      description: field(formData, "description") || null,
      imageUrl,
      linkUrl: offerLink(field(formData, "linkUrl")),
      startsAt: optionalInstant(formData, "startsAt"),
      endsAt: optionalInstant(formData, "endsAt"),
      isActive: flag(formData, "isActive"),
      sortOrder: Number.parseInt(field(formData, "sortOrder") || "0", 10) || 0,
      updatedAt: new Date(),
    };
    if (id) {
      await db.update(offer).set(values).where(eq(offer.id, id));
    } else {
      await db.insert(offer).values({ id: newId(), ...values });
    }
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { error: actionError(error, "تعذر حفظ العرض") };
  }
  revalidatePath("/");
  redirect("/admin/offers");
}

export async function saveRibbonAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = field(formData, "id");
  const buttonLabel = field(formData, "buttonLabel") || "شاهدي";
  if (buttonLabel.length > 24) return { error: "نص الزر طويل" };
  let imageUrl = field(formData, "existingImage");
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) imageUrl = await saveProductImage(file);
    if (!imageUrl) return { error: "الصورة مطلوبة" };
    const values = {
      imageUrl,
      linkUrl: offerLink(field(formData, "linkUrl")),
      buttonLabel,
      isActive: flag(formData, "isActive"),
      sortOrder: Number.parseInt(field(formData, "sortOrder") || "0", 10) || 0,
      updatedAt: new Date(),
    };
    if (id) {
      await db.update(homeRibbon).set(values).where(eq(homeRibbon.id, id));
    } else {
      await db.insert(homeRibbon).values({ id: newId(), ...values });
    }
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { error: actionError(error, "تعذر حفظ الصورة") };
  }
  revalidatePath("/");
  redirect("/admin/ribbons");
}

export async function deleteRibbonAction(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "id");
  const [row] = await db.select({ imageUrl: homeRibbon.imageUrl }).from(homeRibbon).where(eq(homeRibbon.id, id)).limit(1);
  await db.delete(homeRibbon).where(eq(homeRibbon.id, id));
  if (row?.imageUrl) await deleteStoredImage(row.imageUrl);
  revalidatePath("/");
  redirect("/admin/ribbons");
}

export async function saveHeroStackAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = field(formData, "id");
  let imageUrl = field(formData, "existingImage");
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) imageUrl = await saveProductImage(file);
    if (!imageUrl) return { error: "الصورة مطلوبة" };
    const values = {
      imageUrl,
      isActive: flag(formData, "isActive"),
      sortOrder: Number.parseInt(field(formData, "sortOrder") || "0", 10) || 0,
      updatedAt: new Date(),
    };
    if (id) {
      await db.update(heroStackImage).set(values).where(eq(heroStackImage.id, id));
    } else {
      await db.insert(heroStackImage).values({ id: newId(), ...values });
    }
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { error: actionError(error, "تعذر حفظ الصورة") };
  }
  revalidatePath("/");
  redirect("/admin/stack");
}

export async function deleteHeroStackAction(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "id");
  const [row] = await db.select({ imageUrl: heroStackImage.imageUrl }).from(heroStackImage).where(eq(heroStackImage.id, id)).limit(1);
  await db.delete(heroStackImage).where(eq(heroStackImage.id, id));
  if (row?.imageUrl) await deleteStoredImage(row.imageUrl);
  revalidatePath("/");
  redirect("/admin/stack");
}

function collagePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\") || trimmed.includes("://")) {
    throw new Error("المسار يجب أن يبدأ بـ /");
  }
  return trimmed;
}

export async function saveCollageTileAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const slot = Number.parseInt(field(formData, "slot"), 10);
  const kind = field(formData, "targetKind");
  if (!Number.isInteger(slot) || slot < 0 || slot > 6) return { error: "مكان الصورة غير صالح" };
  if (kind !== "brand" && kind !== "category" && kind !== "page") return { error: "وجهة الضغط غير صالحة" };
  let imageUrl = field(formData, "existingImage");
  const file = formData.get("image");
  try {
    if (file instanceof File && file.size > 0) imageUrl = await saveProductImage(file);
    if (!imageUrl) return { error: "الصورة مطلوبة" };
    let targetValue = "";
    if (kind === "brand") {
      targetValue = field(formData, "brandSlug");
      const [row] = await db.select({ id: brand.id }).from(brand).where(eq(brand.slug, targetValue)).limit(1);
      if (!row) return { error: "اختاري علامة" };
    } else if (kind === "category") {
      targetValue = field(formData, "categorySlug");
      const [row] = await db.select({ id: category.id }).from(category).where(eq(category.slug, targetValue)).limit(1);
      if (!row) return { error: "اختاري تصنيفاً" };
    } else {
      targetValue = collagePath(field(formData, "path"));
    }
    const values = { imageUrl, targetKind: kind, targetValue, updatedAt: new Date() };
    const [existing] = await db.select({ id: homeCollageTile.id }).from(homeCollageTile).where(eq(homeCollageTile.slot, slot)).limit(1);
    if (existing) {
      await db.update(homeCollageTile).set(values).where(eq(homeCollageTile.id, existing.id));
    } else {
      await db.insert(homeCollageTile).values({ id: newId(), slot, ...values });
    }
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { error: actionError(error, "تعذر حفظ الصورة") };
  }
  revalidatePath("/");
  redirect(`/admin/collage?slot=${slot}`);
}

export async function deleteOfferAction(formData: FormData) {
  await requireAdmin();
  await db.delete(offer).where(eq(offer.id, field(formData, "id")));
  revalidatePath("/");
  redirect("/admin/offers");
}

export async function saveDiscountAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  assertCanAdmin(actor.role);
  const code = field(formData, "code").toUpperCase();
  const type = field(formData, "type");
  const id = field(formData, "id");
  if (!/^[A-Z0-9-]{3,30}$/.test(code)) return { error: "الرمز يجب أن يكون بالإنجليزية بدون مسافات" };
  if (type !== "percent" && type !== "fixed") return { error: "نوع الخصم غير صالح" };
  try {
    const settings = await getSettings();
    if (!settings) return { error: "إعدادات المتجر غير مكتملة" };
    const rawValue = field(formData, "value");
    const value = type === "percent" ? Number.parseInt(rawValue, 10) : majorToMinor(rawValue, settings.minorUnit);
    if (type === "percent" && (value < 1 || value > 100)) return { error: "النسبة يجب أن تكون بين ١ و ١٠٠" };
    const usageRaw = field(formData, "usageLimit");
    const values = {
      code,
      type,
      value,
      minSubtotalMinor: majorToMinor(field(formData, "minSubtotal") || "0", settings.minorUnit),
      startsAt: optionalInstant(formData, "startsAt"),
      endsAt: optionalInstant(formData, "endsAt"),
      usageLimit: usageRaw ? Number.parseInt(usageRaw, 10) : null,
      isActive: flag(formData, "isActive"),
      updatedAt: new Date(),
    };
    if (values.usageLimit != null && (!Number.isInteger(values.usageLimit) || values.usageLimit < 1)) {
      return { error: "حد الاستخدام غير صالح" };
    }
    if (id) await db.update(discountCode).set(values).where(eq(discountCode.id, id));
    else await db.insert(discountCode).values({ id: newId(), ...values });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "هذا الرمز مستخدم" };
    return { error: actionError(error, "تعذر حفظ الرمز") };
  }
  redirect("/admin/discounts");
}

export async function deleteDiscountAction(formData: FormData) {
  await requireAdmin();
  await db.delete(discountCode).where(eq(discountCode.id, field(formData, "id")));
  redirect("/admin/discounts");
}

export async function saveZoneAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = field(formData, "name");
  const id = field(formData, "id");
  if (name.length < 2) return { error: "اسم المنطقة مطلوب" };
  try {
    const { minor } = await minorField(formData, "fee");
    const values = {
      name,
      feeMinor: minor,
      isActive: flag(formData, "isActive"),
      sortOrder: Number.parseInt(field(formData, "sortOrder") || "0", 10) || 0,
      updatedAt: new Date(),
    };
    if (id) await db.update(deliveryZone).set(values).where(eq(deliveryZone.id, id));
    else await db.insert(deliveryZone).values({ id: newId(), ...values });
  } catch (error) {
    return { error: actionError(error, "تعذر حفظ منطقة التوصيل") };
  }
  redirect("/admin/delivery");
}

export async function deleteZoneAction(formData: FormData) {
  await requireAdmin();
  await db.delete(deliveryZone).where(eq(deliveryZone.id, field(formData, "id")));
  redirect("/admin/delivery");
}

export async function updateOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  const status = field(formData, "status");
  const id = field(formData, "id");
  if (!isOrderStatus(status)) return { error: "حالة غير صالحة" };
  try {
    const result = await transitionOrder({
      actorId: actor.id,
      actorRole: actor.role,
      orderId: id,
      status,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    return { ok: result.unchanged ? "الحالة كما هي" : "تم تحديث الطلب" };
  } catch (error) {
    return { error: actionError(error, "تعذر تحديث الطلب") };
  }
}

export async function addOrderNoteAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin();
  const id = field(formData, "id");
  try {
    await addOrderNote({
      actorId: actor.id,
      actorRole: actor.role,
      orderId: id,
      body: field(formData, "body"),
    });
  } catch (error) {
    return { error: actionError(error, "تعذر حفظ الملاحظة") };
  }
  revalidatePath(`/admin/orders/${id}`);
  return { ok: "حُفظت الملاحظة الداخلية" };
}

export async function recordPaymentReceivedAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdmin();
  try {
    const result = await recordPaymentReceived({
      actorId: actor.id,
      actorRole: actor.role,
      orderId: field(formData, "id"),
      confirmed: formData.get("confirmPayment") === "yes",
    });
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    return { ok: result.alreadyPaid ? "المبلغ مسجل من قبل" : "تم تسجيل استلام المبلغ" };
  } catch (error) {
    return { error: actionError(error, "تعذر تسجيل الدفع") };
  }
}

export async function banCustomerAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = field(formData, "id");
  if (id === actor.id) redirect(`/admin/customers/${id}`);
  await db
    .update(user)
    .set({
      banned: formData.get("banned") === "1",
      banReason: field(formData, "banReason") || null,
      updatedAt: new Date(),
    })
    .where(and(eq(user.id, id), eq(user.role, "user")));
  redirect(`/admin/customers/${id}`);
}

export async function saveSettingsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const storeName = field(formData, "storeName");
  const currency = field(formData, "currency").toUpperCase();
  const minorUnit = Number.parseInt(field(formData, "minorUnit") || "100", 10);
  if (storeName.length < 2) return { error: "اسم المتجر مطلوب" };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "رمز العملة يجب أن يكون من ٣ أحرف" };
  if (![1, 10, 100, 1000].includes(minorUnit)) return { error: "وحدة العملة غير صالحة" };
  const notifyEmail = field(formData, "orderNotifyEmail");
  const contactEmail = field(formData, "contactEmail");
  if (notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) return { error: "بريد الإشعارات غير صالح" };
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { error: "بريد التواصل غير صالح" };
  const contactPhone = field(formData, "contactPhone");
  if (contactPhone.length > 30) return { error: "رقم التواصل طويل" };
  try {
    const [existing] = await db.select().from(storeSetting).limit(1);
    const previousLogo = existing?.logoUrl ?? null;
    let logoUrl = previousLogo;
    if (formData.get("removeLogo") === "yes") logoUrl = null;
    const file = formData.get("logo");
    if (file instanceof File && file.size > 0) logoUrl = await saveProductImage(file);
    const values = {
      storeName,
      tagline: field(formData, "tagline") || null,
      logoUrl,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      currency,
      minorUnit,
      whatsappUrl: whatsappUrl(field(formData, "whatsappUrl")),
      instagramUrl: instagramUrl(field(formData, "instagramUrl")),
      orderNotifyEmail: notifyEmail || null,
      bankInstructions: field(formData, "bankInstructions") || null,
      codEnabled: flag(formData, "codEnabled"),
      bankTransferEnabled: flag(formData, "bankTransferEnabled"),
      updatedAt: new Date(),
    };
    if (existing) await db.update(storeSetting).set(values).where(eq(storeSetting.id, existing.id));
    else await db.insert(storeSetting).values({ id: "store", defaultDeliveryFeeMinor: 0, ...values });
    if (previousLogo && previousLogo !== logoUrl) await deleteStoredImage(previousLogo);
  } catch (error) {
    return { error: actionError(error, "تعذر حفظ الإعدادات") };
  }
  revalidatePath("/", "layout");
  revalidatePath("/contact");
  return { ok: "تم حفظ الإعدادات" };
}

export async function savePageAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const slug = field(formData, "slug");
  const title = field(formData, "title");
  const body = field(formData, "body");
  if (!title || !body) return { error: "العنوان والنص مطلوبان" };
  const unsafe = pageBodyError(body);
  if (unsafe) return { error: unsafe };
  const updated = await db
    .update(contentPage)
    .set({
      title,
      body,
      approvedAt: formData.get("approve") === "yes" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(contentPage.slug, slug))
    .returning({ id: contentPage.id });
  if (updated.length === 0) return { error: "الصفحة غير موجودة" };
  revalidatePath(`/pages/${slug}`);
  return { ok: "تم حفظ الصفحة" };
}

export async function markMessageAction(formData: FormData) {
  await requireAdmin();
  await db
    .update(contactMessage)
    .set({ isRead: true })
    .where(eq(contactMessage.id, field(formData, "id")));
  redirect("/admin/messages");
}

export async function contactAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const message = field(formData, "message");
  if (name.length < 2 || message.length < 5 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "اكتبي الاسم والبريد والرسالة" };
  }
  await db.insert(contactMessage).values({
    id: newId(),
    name,
    email,
    phone: field(formData, "phone") || null,
    message,
  });
  return { ok: "وصلت رسالتك، وسنرد في أقرب وقت." };
}
