import { describe, expect, it } from "vitest";
import { findClip, isGlbPayload } from "./model-bytes";
import { nextQuality, tierFromSignals } from "./quality";
import { castShadows, pixelRatioCap, productLayout, scenePose, tierDetail } from "./scene-config";

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
    expect(nextQuality("medium", 0.02)).toBe("medium");
    expect(nextQuality("low", 0.02)).toBe("low");
  });
});

describe("tierFromSignals", () => {
  it("uses core count when Safari does not report memory", () => {
    expect(tierFromSignals({ webgl: false, memory: 16, cores: 16 })).toBe("fallback");
    expect(tierFromSignals({ webgl: true })).toBe("low");
    expect(tierFromSignals({ webgl: true, memory: 8 })).toBe("low");
    expect(tierFromSignals({ webgl: true, cores: 8 })).toBe("high");
    expect(tierFromSignals({ webgl: true, cores: 4 })).toBe("medium");
    expect(tierFromSignals({ webgl: true, cores: 2 })).toBe("low");
    expect(tierFromSignals({ webgl: true, memory: 4, cores: 4 })).toBe("medium");
    expect(tierFromSignals({ webgl: true, memory: 2, cores: 8 })).toBe("low");
    expect(tierFromSignals({ webgl: true, memory: 8, cores: 8 })).toBe("high");
  });
});

describe("narrow rendering", () => {
  it("keeps phone pictures sharp and saves shadows for the high tier", () => {
    expect(pixelRatioCap("high", true)).toBe(2);
    expect(pixelRatioCap("medium", true)).toBe(1.5);
    expect(pixelRatioCap("low", true)).toBe(1.25);
    expect(pixelRatioCap("high", false)).toBe(2);
    expect(pixelRatioCap("low", false)).toBe(1);
    expect(castShadows("high", true)).toBe(true);
    expect(castShadows("medium", true)).toBe(false);
    expect(castShadows("high", false)).toBe(true);
  });
});

describe("model payload", () => {
  it("accepts a GLB header and rejects an HTML error page", () => {
    const glb = new Uint8Array(12);
    glb.set([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0]);
    expect(isGlbPayload(glb)).toBe(true);
    expect(isGlbPayload(new TextEncoder().encode("<!DOCTYPE html>"))).toBe(false);
    expect(isGlbPayload(new Uint8Array([0x67, 0x6c]))).toBe(false);
  });

  it("skips a missing animation clip", () => {
    expect(findClip([], "Reveal")).toBeNull();
    expect(findClip([{ name: "Reveal" }], "Reveal")?.name).toBe("Reveal");
    expect(findClip([{ name: "Idle" }], "Reveal")?.name).toBe("Idle");
  });
});
