const STILL_KEY = "glossy-still";

type Preference = "scene" | "still";

const listeners = new Set<() => void>();

export function readHeroPreference(): Preference {
  if (typeof window === "undefined") return "scene";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "still";
  return window.sessionStorage.getItem(STILL_KEY) === "1" ? "still" : "scene";
}

export function heroMotionLocked() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function subscribeHeroPreference(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

export function setHeroStill(still: boolean) {
  if (still) window.sessionStorage.setItem(STILL_KEY, "1");
  else window.sessionStorage.removeItem(STILL_KEY);
  listeners.forEach((listener) => listener());
}
