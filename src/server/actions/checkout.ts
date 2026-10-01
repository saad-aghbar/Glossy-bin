"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { address } from "@/db/schema";
import { getOrCreateCart } from "@/lib/cart";
import { addressFieldErrors } from "@/lib/checkout-fields";
import { EmailConfigError, EmailDeliveryError, sendMail } from "@/lib/email";
import { CheckoutError, placeOrder } from "@/lib/orders";
import { formatMinor } from "@/lib/money";
import { actionError, field, isNextRedirect, type ActionState } from "@/lib/form";
import { isPaymentMethod } from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";
import { getSettings, quoteCheckout } from "@/server/queries";

export async function checkoutAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const current = await getCurrentUser();
  if (current?.banned) return { error: "تم إيقاف هذا الحساب" };
  const paymentMethod = field(formData, "paymentMethod");
  if (!isPaymentMethod(paymentMethod)) return { error: "طريقة الدفع غير متاحة" };

  let recipientName = field(formData, "recipientName");
  let phone = field(formData, "phone");
  const email = (field(formData, "email") || current?.email || "").toLowerCase();
  let city = field(formData, "city");
  let area = field(formData, "area");
  let street = field(formData, "street");
  let notes = field(formData, "notes");
  const addressId = field(formData, "addressId");
  if (addressId) {
    if (!current) return { error: "سجّلي الدخول لاستخدام عنوان محفوظ" };
    const [saved] = await db
      .select()
      .from(address)
      .where(and(eq(address.id, addressId), eq(address.userId, current.id)))
      .limit(1);
    if (!saved) return { error: "العنوان غير موجود" };
    recipientName = saved.recipientName;
    phone = saved.phone;
    city = saved.city;
    area = saved.area;
    street = saved.street;
    notes = saved.notes ?? notes;
  }
  if (!recipientName || !phone || !email || !city || !area || !street) {
    const fields = addressFieldErrors({ recipientName, phone, email, city, area, street });
    if (Object.keys(fields).length) return { fields };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { fields: { email: "البريد غير صالح" } };
  }

  try {
    const active = await getOrCreateCart();
    const quote = await quoteCheckout(field(formData, "deliveryZoneId"), field(formData, "discountCode"));
    if (quote.blocked) return { error: "راجعي السلة: بعض القطع لم تعد متاحة أو كميتها أكبر من المتوفر." };
    const placed = await placeOrder({
      cartId: active.id,
      userId: current && !current.banned ? current.id : null,
      recipientName,
      phone,
      email,
      city,
      area,
      street,
      notes,
      deliveryZoneId: field(formData, "deliveryZoneId"),
      discountCode: field(formData, "discountCode"),
      idempotencyKey: field(formData, "idempotencyKey") || undefined,
      paymentMethod,
      saveAddress: formData.get("saveAddress") === "on" && Boolean(current),
    });
    const settings = await getSettings();
    const total = formatMinor(placed.totalMinor, placed.currency, placed.minorUnit);
    const notices = [
      settings?.orderNotifyEmail
        ? {
            to: settings.orderNotifyEmail,
            subject: `طلب جديد ${placed.number}`,
            html: `<p dir="rtl">طلب ${placed.number}</p><p dir="rtl">الإجمالي ${total}</p>`,
            text: `طلب ${placed.number}\nالإجمالي ${total}`,
          }
        : null,
      {
        to: email,
        subject: `تأكيد طلب Glossy ${placed.number}`,
        html: `<p dir="rtl">تم استلام طلبك رقم ${placed.number}.</p>`,
        text: `تم استلام طلبك رقم ${placed.number}.`,
      },
    ];
    for (const notice of notices) {
      if (!notice) continue;
      try {
        await sendMail(notice);
      } catch (error) {
        if (!(error instanceof EmailConfigError) && !(error instanceof EmailDeliveryError)) throw error;
      }
    }
    revalidatePath("/cart");
    redirect(`/orders/confirm/${placed.publicToken}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { error: error instanceof CheckoutError ? error.message : actionError(error, "تعذر إتمام الطلب") };
  }
}
