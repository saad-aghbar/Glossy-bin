import { describe, expect, it } from "vitest";
import { discountMessage, discountWindowProblem, priceOrder } from "./pricing";

describe("priceOrder", () => {
  const lines = [
    { variantId: "a", unitPriceMinor: 1000, qty: 2 },
    { variantId: "b", unitPriceMinor: 500, qty: 1 },
  ];

  it("calculates the total from stored unit prices, discount, and delivery", () => {
    const totals = priceOrder({
      lines,
      discount: { type: "percent", value: 10, minSubtotalMinor: 0 },
      deliveryFeeMinor: 1500,
    });
    expect(totals).toEqual({
      subtotalMinor: 2500,
      discountMinor: 250,
      deliveryFeeMinor: 1500,
      totalMinor: 3750,
    });
  });

  it("ignores a discount that does not meet the minimum", () => {
    const totals = priceOrder({
      lines,
      discount: { type: "fixed", value: 500, minSubtotalMinor: 5000 },
      deliveryFeeMinor: 0,
    });
    expect(totals.discountMinor).toBe(0);
    expect(totals.totalMinor).toBe(2500);
  });

  it("never lets a fixed discount exceed the subtotal", () => {
    const totals = priceOrder({
      lines,
      discount: { type: "fixed", value: 9000, minSubtotalMinor: 0 },
      deliveryFeeMinor: 200,
    });
    expect(totals.discountMinor).toBe(2500);
    expect(totals.totalMinor).toBe(200);
  });

  it("rejects a tampered quantity", () => {
    expect(() =>
      priceOrder({
        lines: [{ variantId: "a", unitPriceMinor: 1000, qty: 0 }],
        discount: null,
        deliveryFeeMinor: 0,
      }),
    ).toThrow("كمية غير صالحة");
  });

  it("uses a distinct message for each discount failure", () => {
    const rule = {
      isActive: true,
      startsAt: null as Date | null,
      endsAt: null as Date | null,
      usageLimit: 1,
      usedCount: 0,
      type: "percent",
      value: 10,
    };
    expect(discountMessage("unknown")).toBe("رمز الخصم غير صالح");
    expect(discountWindowProblem({ ...rule, startsAt: new Date("2999-01-01") }, new Date("2026-01-01"))).toBe("not_started");
    expect(discountMessage("not_started")).toBe("رمز الخصم لم يبدأ بعد");
    expect(discountWindowProblem({ ...rule, endsAt: new Date("2020-01-01") }, new Date("2026-01-01"))).toBe("expired");
    expect(discountMessage("expired")).toBe("انتهت صلاحية رمز الخصم");
    expect(discountWindowProblem({ ...rule, usedCount: 1 }, new Date("2026-01-01"))).toBe("used");
    expect(discountMessage("used")).toBe("رمز الخصم استُهلك");
    expect(discountMessage("minimum")).toBe("الطلب أقل من الحد الأدنى لرمز الخصم");
  });
});
