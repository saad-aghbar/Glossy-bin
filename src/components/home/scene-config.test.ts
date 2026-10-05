import { describe, expect, it } from "vitest";
import { nextQuality } from "./quality";
import { productLayout, scenePose, tierDetail } from "./scene-config";

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

  it("keeps desktop products apart", () => {
    const rest = scenePose(0, false);
    expect(rest.lipstick[0] - rest.compact[0]).toBeGreaterThan(3);
    expect(Math.abs(rest.gloss[0] - rest.lipstick[0])).toBeGreaterThan(1.4);
    expect(Math.abs(rest.gloss[0] - rest.compact[0])).toBeGreaterThan(1.4);
    expect(productLayout.lipstick[0] - productLayout.compact[0]).toBeGreaterThan(3);
  });

  it("shows one product at a time on a narrow screen", () => {
    const compact = scenePose(0.1, true);
    const gloss = scenePose(0.5, true);
    const lipstick = scenePose(0.85, true);
    expect(Math.abs(compact.compact[0])).toBeLessThan(0.2);
    expect(Math.abs(compact.lipstick[0])).toBeGreaterThan(2);
    expect(Math.abs(compact.gloss[0])).toBeGreaterThan(2);
    expect(Math.abs(gloss.gloss[0])).toBeLessThan(0.2);
    expect(Math.abs(gloss.compact[0])).toBeGreaterThan(2);
    expect(Math.abs(lipstick.lipstick[0])).toBeLessThan(0.2);
    expect(Math.abs(lipstick.compact[0])).toBeGreaterThan(2);
    expect(compact.focus).toBe("compact");
    expect(gloss.focus).toBe("gloss");
    expect(lipstick.focus).toBe("lipstick");
  });

  it("hands the stage from one product to the next without a gap or a collision", () => {
    for (let step = 0; step <= 100; step += 1) {
      const pose = scenePose(step / 100, true);
      const xs = [pose.compact[0], pose.gloss[0], pose.lipstick[0]];
      expect(Math.min(...xs.map((x) => Math.abs(x)))).toBeLessThan(1);
      for (let index = 0; index < xs.length; index += 1) {
        for (let other = index + 1; other < xs.length; other += 1) {
          if (Math.abs(xs[index]) < 2 && Math.abs(xs[other]) < 2) {
            expect(Math.abs(xs[index] - xs[other])).toBeGreaterThan(1.4);
          }
        }
      }
    }
  });
});

describe("tierDetail", () => {
  it("keeps the studio environment on every quality tier", () => {
    expect(tierDetail.low.environment).toBe(true);
    expect(tierDetail.medium.environment).toBe(true);
    expect(tierDetail.high.environment).toBe(true);
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
