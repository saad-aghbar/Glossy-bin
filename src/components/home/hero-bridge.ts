import type { QualityTier } from "./scene-config";

export const heroBridge = {
  progress: 0,
  pointerX: 0,
  pointerY: 0,
  playing: true,
  allowPointer: false,
  tier: "medium" as QualityTier,
  frameMs: 0,
  calls: 0,
  triangles: 0,
  invalidate: () => {},
};
