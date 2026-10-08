import { describe, expect, it } from "vitest";
import { heroProgress, shouldRefreshStage } from "./hero-geometry";

describe("heroProgress", () => {
  it("clamps progress to the section travel", () => {
    expect(heroProgress(0, 0, 2200, 1000)).toBe(0);
    expect(heroProgress(500, 0, 2200, 1000)).toBeCloseTo(500 / 1200);
    expect(heroProgress(5000, 0, 2200, 1000)).toBe(1);
    expect(heroProgress(-40, 0, 2200, 1000)).toBe(0);
  });

  it("measures from the section start and the stable stage", () => {
    expect(heroProgress(300, 100, 2200, 1000)).toBeCloseTo(200 / 1200);
    expect(heroProgress(100, 100, 1000, 1000)).toBe(0);
  });

  it("does not take a viewport height, so a toolbar change cannot move progress", () => {
    const beforeToolbar = heroProgress(480, 0, 2200, 700);
    const afterToolbar = heroProgress(480, 0, 2200, 700);
    expect(afterToolbar).toBe(beforeToolbar);
    expect(heroProgress.length).toBe(4);
  });
});

describe("shouldRefreshStage", () => {
  it("ignores a toolbar-sized height change on a touch device", () => {
    expect(
      shouldRefreshStage({
        previousWidth: 390,
        nextWidth: 390,
        previousStage: 700,
        nextStage: 780,
        finePointer: false,
      }),
    ).toBe(false);
  });

  it("accepts a width change and a desktop window resize", () => {
    expect(
      shouldRefreshStage({
        previousWidth: 390,
        nextWidth: 844,
        previousStage: 700,
        nextStage: 390,
        finePointer: false,
      }),
    ).toBe(true);
    expect(
      shouldRefreshStage({
        previousWidth: 1280,
        nextWidth: 1280,
        previousStage: 800,
        nextStage: 900,
        finePointer: true,
      }),
    ).toBe(true);
  });

  it("locks the first measurement and ignores an unchanged stage", () => {
    expect(
      shouldRefreshStage({
        previousWidth: 390,
        nextWidth: 390,
        previousStage: 0,
        nextStage: 700,
        finePointer: false,
      }),
    ).toBe(true);
    expect(
      shouldRefreshStage({
        previousWidth: 390,
        nextWidth: 390,
        previousStage: 700,
        nextStage: 700,
        finePointer: false,
      }),
    ).toBe(false);
    expect(
      shouldRefreshStage({
        previousWidth: 390,
        nextWidth: 390,
        previousStage: 700,
        nextStage: 0,
        finePointer: true,
      }),
    ).toBe(false);
  });
});
