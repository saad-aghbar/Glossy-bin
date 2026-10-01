import { describe, expect, it } from "vitest";
import { addressFieldErrors } from "./checkout-fields";

describe("checkout field errors", () => {
  it("names each missing address field", () => {
    expect(
      addressFieldErrors({
        recipientName: "",
        phone: "",
        email: "bad",
        city: "",
        area: "",
        street: "",
      }),
    ).toEqual({
      recipientName: "الاسم مطلوب",
      phone: "الهاتف مطلوب",
      email: "البريد غير صالح",
      city: "المدينة مطلوبة",
      area: "الحي مطلوب",
      street: "الشارع مطلوب",
    });
  });
});
