export type ActionState = {
  error?: string;
  ok?: string;
  devResetUrl?: string;
  fields?: {
    recipientName?: string;
    phone?: string;
    email?: string;
    city?: string;
    area?: string;
    street?: string;
  };
} | null;

export function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function flag(formData: FormData, name: string) {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

export function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function authLinkMessage(code: string) {
  if (code === "TOKEN_EXPIRED") return "انتهت صلاحية الرابط. اطلبي رابطاً جديداً.";
  if (code === "INVALID_TOKEN") return "الرابط غير صالح أو استُخدم من قبل.";
  return "تعذر إكمال الرابط. اطلبي رابطاً جديداً.";
}

export function actionError(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "body" in error) {
    const code = (error as { body?: { code?: string } }).body?.code;
    if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return "هذا البريد مسجل مسبقاً";
    }
    if (code === "INVALID_EMAIL_OR_PASSWORD") return "البريد أو كلمة المرور غير صحيحة";
    if (code === "PASSWORD_TOO_SHORT") return "كلمة المرور يجب أن تكون ٨ أحرف على الأقل";
    if (code === "INVALID_TOKEN") return "الرابط غير صالح أو استُخدم من قبل.";
    if (code === "TOKEN_EXPIRED") return "انتهت صلاحية الرابط. اطلبي رابطاً جديداً.";
    if (code === "TOO_MANY_REQUESTS") return "محاولات كثيرة. انتظري قليلاً ثم حاولي مرة أخرى.";
    if (code === "INVALID_PASSWORD") return "كلمة المرور الحالية غير صحيحة";
  }
  if (error instanceof Error) {
    if (error.message === "FORBIDDEN" || error.message === "UNAUTHORIZED") return "غير مصرح";
    if (error.name === "CheckoutError") return error.message;
    if (error.name === "EmailConfigError") return "إعداد البريد غير مكتمل. لم تُرسل الرسالة.";
    if (error.name === "EmailDeliveryError") return "تعذر إرسال الرسالة. حاولي لاحقاً.";
    if (
      error.message.startsWith("المبلغ") ||
      error.message.startsWith("الكمية") ||
      error.message.startsWith("الصورة") ||
      error.message.startsWith("حجم") ||
      error.message.startsWith("رمز") ||
      error.message.startsWith("التاريخ") ||
      error.message.startsWith("إعدادات") ||
      error.message.startsWith("وحدة") ||
      error.message.startsWith("لا يمكن") ||
      error.message.startsWith("رابط") ||
      error.message.startsWith("اكتبي") ||
      error.message.startsWith("بريد")
    ) {
      return error.message;
    }
  }
  return fallback;
}
