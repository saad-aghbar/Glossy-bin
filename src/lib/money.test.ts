import { describe, expect, it } from "vitest";
import { formatMinor, majorToMinor } from "./money";

describe("money", () => {
  it("converts major amounts to minor units", () => {
    expect(majorToMinor("10.50", 100)).toBe(1050);
    expect(majorToMinor("10,5", 100)).toBe(1050);
    expect(majorToMinor("10", 100)).toBe(1000);
    expect(majorToMinor("1.250", 1000)).toBe(1250);
  });

  it("rejects extra precision and junk", () => {
    expect(() => majorToMinor("1.234", 100)).toThrow("المبلغ غير صالح");
    expect(() => majorToMinor("-1", 100)).toThrow("المبلغ غير صالح");
    expect(() => majorToMinor("abc", 100)).toThrow("المبلغ غير صالح");
  });

  it("formats from minor units rather than a client total", () => {
    expect(formatMinor(1050, "SAR", 100)).toContain("10.50");
  });
});
