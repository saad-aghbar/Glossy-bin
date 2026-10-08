import { clamp01 } from "./scene-config";

export function heroProgress(scrollY: number, sectionTop: number, sectionHeight: number, stageHeight: number) {
  const distance = Math.max(0, sectionHeight - stageHeight);
  if (distance <= 0) return 0;
  const passed = Math.min(Math.max(scrollY - sectionTop, 0), distance);
  return clamp01(passed / distance);
}

export function shouldRefreshStage({
  previousWidth,
  nextWidth,
  previousStage,
  nextStage,
  finePointer,
}: {
  previousWidth: number;
  nextWidth: number;
  previousStage: number;
  nextStage: number;
  finePointer: boolean;
}) {
  if (!(nextStage > 0)) return false;
  if (previousStage === 0) return true;
  if (nextStage === previousStage) return false;
  if (nextWidth === previousWidth && !finePointer) return false;
  return true;
}

export function measureStableStage() {
  if (typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:100vh";
  document.documentElement.appendChild(probe);
  const vh = probe.offsetHeight;
  probe.style.height = "100svh";
  const svh = probe.offsetHeight;
  probe.remove();
  const height = svh > 0 ? svh : vh;
  return height > 0 ? Math.round(height) : 0;
}
