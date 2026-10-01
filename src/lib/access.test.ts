import { describe, expect, it } from "vitest";
import { assertCanAdmin, canReadOrder, isAdminRole, safeNextPath } from "./access";

describe("access", () => {
  it("accepts only an admin role", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("user,admin")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(() => assertCanAdmin("user")).toThrow("FORBIDDEN");
    expect(() => assertCanAdmin("admin")).not.toThrow();
  });

  it("lets a customer read only their own order", () => {
    expect(canReadOrder("user-1", "user-1")).toBe(true);
    expect(canReadOrder("user-1", "user-2")).toBe(false);
    expect(canReadOrder(null, "user-2")).toBe(false);
  });

  it("rejects external redirect targets", () => {
    expect(safeNextPath("/admin/products")).toBe("/admin/products");
    expect(safeNextPath("https://evil.example")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
  });
});
