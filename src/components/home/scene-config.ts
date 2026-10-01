export const heroCopy = {
  headingFallback: "لمسة هادئة من الجمال",
  ending: "اكتشفي مجموعتنا",
  shop: "تسوّقي الآن",
  skip: "تخطّي المقدّمة",
  still: "عرض ثابت",
  motion: "تشغيل الحركة",
} as const;

export const heroLength = {
  mobile: "220dvh",
  desktop: "300dvh",
} as const;

export const sceneColors = {
  background: "#f6f1ea",
  espresso: "#2c2420",
  rose: "#c4898f",
  powder: "#e7b7b0",
  gloss: "#d98a93",
  champagne: "#c6a27a",
  ivory: "#fbf7f2",
  milk: "#f0d5d2",
} as const;

export type QualityTier = "high" | "medium" | "low";

export const tierDetail = {
  high: { shadow: true, environment: true, dprMax: 2 },
  medium: { shadow: false, environment: true, dprMax: 1.5 },
  low: { shadow: false, environment: false, dprMax: 1 },
} as const;

export const productScale = 15;

export const clipDuration = 2;

export const productLayout = {
  lipstick: [0.82, 0, 0] as [number, number, number],
  compact: [-0.92, 0, -0.04] as [number, number, number],
  gloss: [0.02, 0, 0.26] as [number, number, number],
};

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function segment(progress: number, start: number, end: number) {
  return clamp01((progress - start) / (end - start));
}

export type ScenePose = {
  camera: [number, number, number];
  look: [number, number, number];
  lipstickTime: number;
  compactTime: number;
  glossTime: number;
  lipstickYaw: number;
  shift: number;
};

const desktopCameras: Array<{ at: number; camera: [number, number, number]; look: [number, number, number] }> = [
  { at: 0, camera: [0.06, 0.72, 4.45], look: [0, 1.02, 0] },
  { at: 0.38, camera: [0.08, 0.66, 3.95], look: [0, 1.02, 0] },
  { at: 0.7, camera: [-0.22, 0.74, 3.85], look: [-0.1, 1.06, 0] },
  { at: 1, camera: [0.02, 0.68, 4.15], look: [0, 0.98, 0] },
];

const narrowCameras: Array<{ at: number; camera: [number, number, number]; look: [number, number, number] }> = [
  { at: 0, camera: [0.02, 1.45, 8.4], look: [0.02, 1.38, 0] },
  { at: 0.35, camera: [0.08, 1.28, 7.3], look: [0.06, 1.32, 0] },
  { at: 0.68, camera: [-0.04, 1.4, 7.6], look: [0, 1.36, 0] },
  { at: 1, camera: [0.02, 1.36, 8], look: [0.02, 1.28, 0] },
];

function sampleCamera(keys: typeof desktopCameras, progress: number) {
  let index = 0;
  while (index < keys.length - 2 && progress > keys[index + 1].at) index += 1;
  const from = keys[index];
  const to = keys[index + 1];
  const span = to.at - from.at || 1;
  const t = clamp01((progress - from.at) / span);
  const mix = (a: [number, number, number], b: [number, number, number]): [number, number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  return { camera: mix(from.camera, to.camera), look: mix(from.look, to.look) };
}

export function scenePose(progress: number, narrow: boolean): ScenePose {
  const shot = sampleCamera(narrow ? narrowCameras : desktopCameras, progress);
  return {
    ...shot,
    lipstickTime: segment(progress, 0.18, 0.48) * clipDuration,
    compactTime: segment(progress, 0.46, 0.76) * clipDuration,
    glossTime: segment(progress, 0.32, 0.68) * clipDuration,
    lipstickYaw: segment(progress, 0.18, 0.5) * 0.22,
    shift: segment(progress, 0.55, 1),
  };
}
