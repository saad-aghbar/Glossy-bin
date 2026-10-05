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
  low: { shadow: false, environment: true, dprMax: 1 },
} as const;

export const productScale = 15;

export const clipDuration = 2;

export const narrowBreak = 900;

export const productLayout = {
  lipstick: [1.72, 0, 0.04] as [number, number, number],
  compact: [-1.72, 0, -0.06] as [number, number, number],
  gloss: [0, 0.02, 0.38] as [number, number, number],
};

const park = 3.8;

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function segment(progress: number, start: number, end: number) {
  return clamp01((progress - start) / (end - start));
}

export type FocusProduct = "compact" | "gloss" | "lipstick" | "all";

export type ScenePose = {
  camera: [number, number, number];
  look: [number, number, number];
  lipstickTime: number;
  compactTime: number;
  glossTime: number;
  lipstickYaw: number;
  shift: number;
  lipstick: [number, number, number];
  compact: [number, number, number];
  gloss: [number, number, number];
  focus: FocusProduct;
};

const desktopCameras: Array<{ at: number; camera: [number, number, number]; look: [number, number, number] }> = [
  { at: 0, camera: [0.04, 0.86, 5.45], look: [0, 1.02, 0] },
  { at: 0.38, camera: [0.1, 0.78, 5.05], look: [0, 1.02, 0] },
  { at: 0.7, camera: [-0.18, 0.84, 4.95], look: [-0.08, 1.04, 0] },
  { at: 1, camera: [0.02, 0.8, 5.25], look: [0, 0.98, 0] },
];

const narrowCameras: Array<{ at: number; camera: [number, number, number]; look: [number, number, number] }> = [
  { at: 0, camera: [0, 0.92, 4.7], look: [0, 0.96, 0] },
  { at: 0.33, camera: [0.04, 0.86, 4.45], look: [0, 0.94, 0] },
  { at: 0.66, camera: [-0.02, 0.9, 4.55], look: [0, 0.95, 0] },
  { at: 1, camera: [0, 0.88, 4.65], look: [0, 0.92, 0] },
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

function smooth(value: number) {
  return value * value * (3 - 2 * value);
}

const wing = 1.75;

function along(progress: number, points: Array<[number, number]>) {
  if (progress <= points[0][0]) return points[0][1];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [start, from] = points[index];
    const [end, to] = points[index + 1];
    if (progress <= end) return from + (to - from) * smooth(segment(progress, start, end));
  }
  return points[points.length - 1][1];
}

export function focusedProduct(progress: number, narrow: boolean): FocusProduct {
  if (!narrow) return "all";
  if (progress < 0.33) return "compact";
  if (progress < 0.66) return "gloss";
  return "lipstick";
}

export function scenePose(progress: number, narrow: boolean): ScenePose {
  const shot = sampleCamera(narrow ? narrowCameras : desktopCameras, progress);
  if (!narrow) {
    return {
      ...shot,
      lipstickTime: segment(progress, 0.18, 0.48) * clipDuration,
      compactTime: segment(progress, 0.46, 0.76) * clipDuration,
      glossTime: segment(progress, 0.32, 0.68) * clipDuration,
      lipstickYaw: segment(progress, 0.18, 0.5) * 0.22,
      shift: segment(progress, 0.55, 1),
      lipstick: productLayout.lipstick,
      compact: productLayout.compact,
      gloss: productLayout.gloss,
      focus: "all",
    };
  }

  return {
    ...shot,
    lipstickTime: segment(progress, 0.76, 1) * clipDuration,
    compactTime: segment(progress, 0, 0.2) * clipDuration,
    glossTime: segment(progress, 0.4, 0.56) * clipDuration,
    lipstickYaw: segment(progress, 0.76, 1) * 0.22,
    shift: 0,
    compact: [along(progress, [[0, 0], [0.2, 0], [0.4, -wing], [0.52, -park], [1, -park]]), 0, -0.04],
    gloss: [along(progress, [[0, park], [0.08, park], [0.2, wing], [0.4, 0], [0.56, 0], [0.76, -wing], [0.88, -park], [1, -park]]), 0.02, 0.2],
    lipstick: [along(progress, [[0, park], [0.52, park], [0.56, wing], [0.76, 0], [1, 0]]), 0, 0.04],
    focus: focusedProduct(progress, true),
  };
}
