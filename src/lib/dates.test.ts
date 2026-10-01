import { describe, expect, it } from "vitest";
import { composeDay, instantFromJerusalem, jerusalemParts, resolveDay } from "./dates";

describe("dates", () => {
  it("keeps a Jerusalem instant when the parts are saved again", () => {
    const original = new Date("2026-01-15T20:30:00.000Z");
    const restored = instantFromJerusalem(jerusalemParts(original));
    expect(restored?.toISOString()).toBe(original.toISOString());
  });

  it("keeps a summer Jerusalem instant too", () => {
    const original = new Date("2026-07-15T18:45:00.000Z");
    const restored = instantFromJerusalem(jerusalemParts(original));
    expect(restored?.toISOString()).toBe(original.toISOString());
  });

  it("rejects a day that does not exist", () => {
    expect(composeDay("2026", "2", "31")).toBe("invalid");
    expect(resolveDay("2026-01-01", "2026", "2", "31")).toBe("invalid");
  });
});
