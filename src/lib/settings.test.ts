import { describe, expect, it } from "vitest";
import { storeTagline } from "@/lib/brand";
import { pageBodyError, publicPageText } from "@/lib/content";
import { instagramUrl, offerLink, visibleBankInstructions, whatsappUrl } from "@/lib/links";
import { configuredPixelId, purchaseEvent, shouldLoadPixel } from "@/lib/tracking";

describe("store settings and pages", () => {
  it("hides an empty slogan and unpublished page text", () => {
    expect(storeTagline("  ")).toBeNull();
    expect(storeTagline(null)).toBeNull();
    expect(storeTagline("مكياج يومي")).toBe("مكياج يومي");
    expect(publicPageText(null, "نص مبدئي سري")).toBe("هذا النص لم يُعتمد بعد.");
    expect(publicPageText(new Date(), "نص العميلة")).toBe("نص العميلة");
  });

  it("rejects unsafe links and html", () => {
    expect(whatsappUrl("")).toBeNull();
    expect(whatsappUrl("https://wa.me/966500000000")).toContain("https://wa.me/");
    expect(() => whatsappUrl("javascript:alert(1)")).toThrow("رابط واتساب غير صالح");
    expect(() => instagramUrl("https://example.com/glossy")).toThrow("رابط إنستغرام غير صالح");
    expect(instagramUrl("https://www.instagram.com/glossy")).toContain("instagram.com/glossy");
    expect(offerLink("")).toBeNull();
    expect(offerLink("/products")).toBe("/products");
    expect(() => offerLink("//evil.example")).toThrow("رابط العرض غير صالح");
    expect(offerLink("https://example.com/look")).toBe("https://example.com/look");
    expect(pageBodyError("نص عادي")).toBeNull();
    expect(pageBodyError("<script>alert(1)</script>")).toBe("اكتبي النص بدون وسوم HTML");
    expect(visibleBankInstructions("cod", "حوّلي المبلغ")).toBeNull();
    expect(visibleBankInstructions("bank_transfer", "  ")).toBeNull();
    expect(visibleBankInstructions("bank_transfer", "حوّلي المبلغ")).toBe("حوّلي المبلغ");
  });

  it("keeps the pixel off without an id, consent, or for an admin", () => {
    expect(configuredPixelId("")).toBe("");
    expect(configuredPixelId("not-an-id")).toBe("");
    expect(configuredPixelId("1234567890")).toBe("1234567890");
    expect(shouldLoadPixel({ pixelId: "", consent: "granted", isAdmin: false })).toBe(false);
    expect(shouldLoadPixel({ pixelId: "1234567890", consent: null, isAdmin: false })).toBe(false);
    expect(shouldLoadPixel({ pixelId: "1234567890", consent: "denied", isAdmin: false })).toBe(false);
    expect(shouldLoadPixel({ pixelId: "1234567890", consent: "granted", isAdmin: true })).toBe(false);
    expect(shouldLoadPixel({ pixelId: "1234567890", consent: "granted", isAdmin: false })).toBe(true);
    expect(purchaseEvent({ currency: "SAR", totalMinor: 10500, minorUnit: 100, publicToken: "abc" })).toEqual({
      currency: "SAR",
      value: 105,
      eventID: "abc",
    });
    expect(JSON.stringify(purchaseEvent({ currency: "SAR", totalMinor: 100, minorUnit: 100, publicToken: "abc" }))).not.toMatch(
      /email|phone|name|address/,
    );
  });
});