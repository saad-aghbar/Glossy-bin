export const orderStatusLabel = {
  pending: "جديد",
  confirmed: "قيد التجهيز",
  shipped: "خرج للتوصيل",
  delivered: "تم التسليم",
  cancelled: "ملغى",
} as const;

export const paymentMethodLabel = {
  cod: "الدفع عند الاستلام",
  bank_transfer: "تحويل بنكي",
} as const;

export const paymentStatusLabel = {
  unpaid: "غير مدفوع",
  awaiting_transfer: "بانتظار التحويل",
  paid: "مدفوع",
  refunded: "مسترد",
} as const;

export type OrderStatus = keyof typeof orderStatusLabel;
export type PaymentMethod = keyof typeof paymentMethodLabel;
export type PaymentStatus = keyof typeof paymentStatusLabel;

export const nextOrderStatuses: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function orderStatusChoices(status: OrderStatus, paymentStatus: string): OrderStatus[] {
  const next = nextOrderStatuses[status].filter((value) => value !== "cancelled" || paymentStatus !== "paid");
  return [status, ...next];
}

export function cancelBlockedMessage(status: OrderStatus, paymentStatus: string) {
  if (status === "delivered") return "لا يمكن إلغاء طلب تم تسليمه.";
  if (paymentStatus === "paid" && status !== "cancelled") {
    return "لا يمكن إلغاء طلب مدفوع من هنا. إعادة المبلغ تتم يدوياً خارج النظام.";
  }
  return null;
}

export function isOrderStatus(value: string): value is OrderStatus {
  return value in orderStatusLabel;
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return value in paymentMethodLabel;
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return value in paymentStatusLabel;
}

export function variantLabel(shadeName: string | null, sizeName: string | null) {
  const parts = [shadeName, sizeName].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "افتراضي";
}
