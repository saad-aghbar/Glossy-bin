export type CartLineView = {
  blocked: boolean;
  messages: string[];
};

export function describeCartLine(input: {
  qty: number;
  stockQty: number;
  unitPriceMinor: number;
  priceSeenMinor: number | null;
  sellable: boolean;
}): CartLineView {
  const messages: string[] = [];
  if (!input.sellable) {
    messages.push("لم يعد هذا المنتج متاحاً للبيع.");
    return { blocked: true, messages };
  }
  if (input.qty > input.stockQty) {
    messages.push(`الكمية المتاحة الآن ${input.stockQty}. خفّضيها قبل الدفع.`);
  }
  if (input.priceSeenMinor != null && input.priceSeenMinor !== input.unitPriceMinor) {
    messages.push("تغيّر سعر هذا المنتج، والسعر الحالي هو المعتمد.");
  }
  return { blocked: messages.some((message) => message.startsWith("الكمية")), messages };
}
