import type { QualityTier } from "./scene-config";

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

export type DeviceSignals = {
  webgl: boolean;
  memory?: number;
  cores?: number;
};

export function tierFromSignals(signals: DeviceSignals): QualityTier | "fallback" {
  if (!signals.webgl) return "fallback";
  const { memory, cores } = signals;
  if (memory != null && memory <= 2) return "low";
  if (memory == null && cores == null) return "low";
  if (memory == null) {
    if ((cores ?? 0) <= 2) return "low";
    if ((cores ?? 0) >= 6) return "high";
    return "medium";
  }
  if (cores == null || cores <= 2) return "low";
  if (memory <= 4 || cores <= 4) return "medium";
  if (memory >= 8 && cores >= 8) return "high";
  return "medium";
}

export function detectQuality(): QualityTier | "fallback" {
  if (typeof window === "undefined") return "low";
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  const nav = navigator as NavigatorWithMemory;
  const tier = tierFromSignals({
    webgl: Boolean(gl),
    memory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined,
    cores: typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : undefined,
  });
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return tier;
}

export function nextQuality(current: QualityTier, averageSeconds: number): QualityTier {
  if (averageSeconds > 0.028 && current === "high") return "medium";
  if (averageSeconds > 0.034 && current === "medium") return "low";
  if (averageSeconds < 0.012 && current === "low") return "medium";
  if (averageSeconds < 0.011 && current === "medium") return "high";
  return current;
}
