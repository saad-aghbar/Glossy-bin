import { describe, expect, it } from "vitest";
import { nextQuality } from "./quality";
import { scenePose } from "./scene-config";

describe("scenePose", () => {
  it("opens the lipstick before the compact", () => {
    const early = scenePose(0.1, false);
    const mid = scenePose(0.4, false);
    const late = scenePose(0.7, false);
    expect(early.lipstickTime).toBe(0);
    expect(early.compactTime).toBe(0);
    expect(mid.lipstickTime).toBeGreaterThan(1);
    expect(mid.compactTime).toBe(0);
    expect(late.lipstickTime).toBe(2);
    expect(late.compactTime).toBeGreaterThan(1);
  });

  it("frames a narrow screen from farther back", () => {
    const desktop = scenePose(0, false);
    const phone = scenePose(0, true);
    expect(phone.camera[2]).toBeGreaterThan(desktop.camera[2]);
  });
});

describe("nextQuality", () => {
  it("changes tier only outside the hysteresis band", () => {
    expect(nextQuality("high", 0.03)).toBe("medium");
    expect(nextQuality("high", 0.02)).toBe("high");
    expect(nextQuality("medium", 0.04)).toBe("low");
    expect(nextQuality("low", 0.01)).toBe("medium");
    expect(nextQuality("medium", 0.0105)).toBe("high");
  });
});
