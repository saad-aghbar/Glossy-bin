"use server";

import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { address, user, verification } from "@/db/schema";
import { safeNextPath } from "@/lib/access";
import { auth } from "@/lib/auth";
import { actionError, field, type ActionState } from "@/lib/form";
import { appBaseUrl, emailFailureState, emailIsConfigured, takeDevVerificationUrl, takeEmailSendFailure } from "@/lib/email";
import { newId } from "@/lib/ids";
import { deleteOwnAddress, updateOwnAddress } from "@/lib/ownership";
import { requireUser } from "@/lib/session";

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function registerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const phone = field(formData, "phone");
  const password = field(formData, "password");
  if (name.length < 2) return { error: "اكتبي الاسم" };
  if (!emailLooksValid(email)) return { error: "البريد غير صالح" };
  if (password.length < 8) return { error: "كلمة المرور يجب أن تكون ٨ أحرف على الأقل" };
  if (process.env.NODE_ENV === "production" && !emailIsConfigured()) {
    return emailFailureState("config");
  }

  try {
    await auth.api.signUpEmail({
      body: { name, email, password, phone: phone || undefined },
      headers: await headers(),
    });
  } catch (error) {
    return { error: actionError(error, "تعذر إنشاء الحساب") };
  }
  const failure = emailFailureState(takeEmailSendFailure(email));
  if (failure) return failure;
  const devVerificationUrl = takeDevVerificationUrl(email);
  if (devVerificationUrl) {
    return {
      ok: "وضع التطوير: خدمة البريد غير مهيأة. أكّدي البريد من الرابط أدناه قبل ربط الطلبات السابقة.",
      devResetUrl: devVerificationUrl,
    };
  }
  redirect("/account");
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  const next = safeNextPath(field(formData, "next"));
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    return { error: actionError(error, "تعذر تسجيل الدخول") };
  }
  redirect(next);
}

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

export async function forgotAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = field(formData, "email").toLowerCase();
  if (!emailLooksValid(email)) return { error: "البريد غير صالح" };
  if (process.env.NODE_ENV === "production" && !emailIsConfigured()) {
    return emailFailureState("config");
  }
  let redirectTo: string;
  try {
    redirectTo = `${appBaseUrl()}/account/reset`;
  } catch {
    return emailFailureState("config");
  }
  try {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo },
      headers: await headers(),
    });
  } catch (error) {
    return { error: actionError(error, "تعذر إرسال رابط الاستعادة") };
  }
  const failure = emailFailureState(takeEmailSendFailure(email));
  if (failure) return failure;

  if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) {
    const [accountUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (accountUser) {
      const rows = await db
        .select()
        .from(verification)
        .where(eq(verification.value, accountUser.id))
        .orderBy(desc(verification.createdAt));
      const row = rows.find((item) => item.identifier.startsWith("reset-password:"));
      if (row) {
        const token = row.identifier.slice("reset-password:".length);
        return {
          ok: "وضع التطوير: خدمة البريد غير مهيأة، استخدمي الرابط أدناه.",
          devResetUrl: `/account/reset?token=${token}`,
        };
      }
    }
  }
  return { ok: "إذا كان البريد مسجلاً فستصلك رسالة الاستعادة." };
}

export async function resetAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const token = field(formData, "token");
  const password = field(formData, "password");
  if (!token) return { error: "رابط الاستعادة غير صالح" };
  if (password.length < 8) return { error: "كلمة المرور يجب أن تكون ٨ أحرف على الأقل" };
  try {
    await auth.api.resetPassword({
      body: { token, newPassword: password },
      headers: await headers(),
    });
  } catch (error) {
    return { error: actionError(error, "تعذر تحديث كلمة المرور") };
  }
  redirect("/account/login");
}

export async function profileAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const name = field(formData, "name");
  const phone = field(formData, "phone");
  if (name.length < 2) return { error: "اكتبي الاسم" };
  try {
    await auth.api.updateUser({
      body: { name, phone },
      headers: await headers(),
    });
  } catch (error) {
    return { error: actionError(error, "تعذر حفظ الملف") };
  }
  return { ok: "تم حفظ الملف" };
}

export async function passwordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const currentPassword = field(formData, "currentPassword");
  const newPassword = field(formData, "newPassword");
  if (newPassword.length < 8) return { error: "كلمة المرور الجديدة قصيرة" };
  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (error) {
    return { error: actionError(error, "تعذر تغيير كلمة المرور") };
  }
  return { ok: "تم تغيير كلمة المرور" };
}

export async function saveAddressAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requireUser();
  const recipientName = field(formData, "recipientName");
  const phone = field(formData, "phone");
  const city = field(formData, "city");
  const area = field(formData, "area");
  const street = field(formData, "street");
  const notes = field(formData, "notes");
  const id = field(formData, "id");
  const isDefault = formData.get("isDefault") === "on";
  if (!recipientName || !phone || !city || !area || !street) return { error: "اكتبي العنوان كاملاً" };

  if (isDefault) {
    await db.update(address).set({ isDefault: false, updatedAt: new Date() }).where(eq(address.userId, current.id));
  }

  if (id) {
    const updated = await updateOwnAddress(current.id, id, {
      recipientName,
      phone,
      city,
      area,
      street,
      notes: notes || null,
      isDefault,
    });
    if (!updated) return { error: "العنوان غير موجود" };
  } else {
    await db.insert(address).values({
      id: newId(),
      userId: current.id,
      recipientName,
      phone,
      city,
      area,
      street,
      notes: notes || null,
      isDefault,
    });
  }
  return { ok: "تم حفظ العنوان" };
}

export async function deleteAddressAction(formData: FormData) {
  const current = await requireUser();
  const id = field(formData, "id");
  await deleteOwnAddress(current.id, id);
  redirect("/account/addresses");
}
