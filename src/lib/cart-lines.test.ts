import { describe, expect, it } from "vitest";
import { describeCartLine } from "./cart-lines";

describe("cart line warnings", () => {
  it("blocks an archived or unpublished line", () => {
    const line = describeCartLine({
      qty: 1,
      stockQty: 4,
      unitPriceMinor: 5000,
      priceSeenMinor: 5000,
      sellable: false,
    });
    expect(line.blocked).toBe(true);
    expect(line.messages[0]).toContain("لم يعد");
  });

  it("blocks a quantity above the current stock and notes a price change without blocking on price alone", () => {
    const over = describeCartLine({
      qty: 3,
      stockQty: 1,
      unitPriceMinor: 6000,
      priceSeenMinor: 5000,
      sellable: true,
    });
    expect(over.blocked).toBe(true);
    expect(over.messages.join(" ")).toContain("1");
    expect(over.messages.join(" ")).toContain("تغيّر سعر");

    const priceOnly = describeCartLine({
      qty: 1,
      stockQty: 4,
      unitPriceMinor: 6000,
      priceSeenMinor: 5000,
      sellable: true,
    });
    expect(priceOnly.blocked).toBe(false);
    expect(priceOnly.messages).toEqual(["تغيّر سعر هذا المنتج، والسعر الحالي هو المعتمد."]);
  });

  it("does not warn when the saved price is unknown", () => {
    const line = describeCartLine({
      qty: 1,
      stockQty: 4,
      unitPriceMinor: 6000,
      priceSeenMinor: null,
      sellable: true,
    });
    expect(line).toEqual({ blocked: false, messages: [] });
  });
});
