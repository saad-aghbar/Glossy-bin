import type { QualityTier } from "./scene-config";

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

export function detectQuality(): QualityTier | "fallback" {
  if (typeof window === "undefined") return "medium";
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) return "fallback";
  const memory = (navigator as NavigatorWithMemory).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (memory <= 2 || cores <= 2) return "low";
  if (memory <= 4 || cores <= 4) return "medium";
  return "high";
}

export function nextQuality(current: QualityTier, averageSeconds: number): QualityTier {
  if (averageSeconds > 0.028 && current === "high") return "medium";
  if (averageSeconds > 0.034 && current === "medium") return "low";
  if (averageSeconds < 0.012 && current === "low") return "medium";
  if (averageSeconds < 0.011 && current === "medium") return "high";
  return current;
}
