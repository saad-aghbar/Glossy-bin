export type PricedLine = {
  variantId: string;
  unitPriceMinor: number;
  qty: number;
};

export type DiscountRule = {
  type: "percent" | "fixed";
  value: number;
  minSubtotalMinor: number;
};

export type OrderTotals = {
  subtotalMinor: number;
  discountMinor: number;
  deliveryFeeMinor: number;
  totalMinor: number;
};

export function priceOrder(input: {
  lines: PricedLine[];
  discount: DiscountRule | null;
  deliveryFeeMinor: number;
}): OrderTotals {
  if (input.lines.length === 0) {
    throw new Error("السلة فارغة");
  }
  if (input.deliveryFeeMinor < 0 || !Number.isInteger(input.deliveryFeeMinor)) {
    throw new Error("رسوم التوصيل غير صالحة");
  }

  let subtotalMinor = 0;
  for (const line of input.lines) {
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99) {
      throw new Error("كمية غير صالحة");
    }
    if (!Number.isInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
      throw new Error("سعر غير صالح");
    }
    subtotalMinor += line.unitPriceMinor * line.qty;
  }

  let discountMinor = 0;
  if (input.discount && subtotalMinor >= input.discount.minSubtotalMinor) {
    if (input.discount.type === "percent") {
      if (input.discount.value < 1 || input.discount.value > 100) {
        throw new Error("نسبة الخصم غير صالحة");
      }
      discountMinor = Math.floor((subtotalMinor * input.discount.value) / 100);
    } else {
      if (!Number.isInteger(input.discount.value) || input.discount.value < 0) {
        throw new Error("قيمة الخصم غير صالحة");
      }
      discountMinor = input.discount.value;
    }
  }
  discountMinor = Math.min(discountMinor, subtotalMinor);
  const totalMinor = subtotalMinor - discountMinor + input.deliveryFeeMinor;
  return {
    subtotalMinor,
    discountMinor,
    deliveryFeeMinor: input.deliveryFeeMinor,
    totalMinor,
  };
}

export function isDiscountWindowOpen(
  rule: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    usageLimit: number | null;
    usedCount: number;
    type: string;
    value: number;
  },
  now: Date,
) {
  return discountWindowProblem(rule, now) === null;
}

export function discountWindowProblem(
  rule: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    usageLimit: number | null;
    usedCount: number;
    type: string;
    value: number;
  },
  now: Date,
): "inactive" | "not_started" | "expired" | "used" | "invalid" | null {
  if (!rule.isActive) return "inactive";
  if (rule.startsAt && rule.startsAt > now) return "not_started";
  if (rule.endsAt && rule.endsAt < now) return "expired";
  if (rule.usageLimit != null && rule.usedCount >= rule.usageLimit) return "used";
  if (rule.type === "percent" && (rule.value < 1 || rule.value > 100)) return "invalid";
  if (rule.type === "fixed" && rule.value < 0) return "invalid";
  if (rule.type !== "percent" && rule.type !== "fixed") return "invalid";
  return null;
}

export function discountMessage(problem: "unknown" | "inactive" | "not_started" | "expired" | "used" | "invalid" | "minimum") {
  if (problem === "not_started") return "رمز الخصم لم يبدأ بعد";
  if (problem === "expired") return "انتهت صلاحية رمز الخصم";
  if (problem === "used") return "رمز الخصم استُهلك";
  if (problem === "minimum") return "الطلب أقل من الحد الأدنى لرمز الخصم";
  return "رمز الخصم غير صالح";
}
