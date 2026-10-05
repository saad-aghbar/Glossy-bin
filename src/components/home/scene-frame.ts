import type { Group, PerspectiveCamera, WebGLRenderer } from "three";
import { heroBridge } from "./hero-bridge";
import { nextQuality } from "./quality";
import { scenePose, type QualityTier } from "./scene-config";

function mix(current: number, target: number, amount: number) {
  return current + (target - current) * amount;
}

function place(group: Group | null, target: [number, number, number], amount: number) {
  if (!group) return;
  group.position.x = mix(group.position.x, target[0], amount);
  group.position.y = mix(group.position.y, target[1], amount);
  group.position.z = mix(group.position.z, target[2], amount);
}

type Scrub = { setTime: (time: number) => void } | null;

function scrub(control: Scrub, time: number) {
  control?.setTime(time);
}

export function stepScene({
  camera,
  delta,
  narrow,
  tier,
  renderer,
  root,
  lipstick,
  compact,
  gloss,
  lipstickMixer,
  compactMixer,
  glossMixer,
  samples,
  snapped,
  switchedAt,
}: {
  camera: PerspectiveCamera;
  delta: number;
  narrow: boolean;
  tier: QualityTier;
  renderer: WebGLRenderer;
  root: Group | null;
  lipstick: Group | null;
  compact: Group | null;
  gloss: Group | null;
  lipstickMixer: Scrub;
  compactMixer: Scrub;
  glossMixer: Scrub;
  samples: number[];
  snapped: { current: boolean };
  switchedAt: { current: number };
}) {
  if (!heroBridge.playing) return tier;
  const pose = scenePose(heroBridge.progress, narrow);
  const amount = snapped.current ? 1 - Math.exp(-10 * delta) : 1;
  snapped.current = true;
  const sway = heroBridge.allowPointer ? 1 : 0;
  camera.position.x = mix(camera.position.x, pose.camera[0] + heroBridge.pointerX * 0.12 * sway, amount);
  camera.position.y = mix(camera.position.y, pose.camera[1] + heroBridge.pointerY * 0.08 * sway, amount);
  camera.position.z = mix(camera.position.z, pose.camera[2], amount);
  camera.lookAt(pose.look[0], pose.look[1], pose.look[2]);

  if (root) root.position.x = mix(root.position.x, -pose.shift * 0.12, amount);
  place(lipstick, pose.lipstick, amount);
  place(compact, pose.compact, amount);
  place(gloss, pose.gloss, amount);
  if (lipstick) lipstick.rotation.y = mix(lipstick.rotation.y, pose.lipstickYaw, amount);
  scrub(lipstickMixer, pose.lipstickTime);
  scrub(compactMixer, pose.compactTime);
  scrub(glossMixer, pose.glossTime);

  const info = renderer.info.render;
  heroBridge.calls = info.calls;
  heroBridge.triangles = info.triangles;
  samples.push(delta);
  if (samples.length > 40) samples.shift();
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  heroBridge.frameMs = average * 1000;
  const now = performance.now();
  let next = tier;
  if (samples.length >= 30 && now - switchedAt.current > 2500) {
    const proposed = nextQuality(tier, average);
    if (proposed !== tier) {
      switchedAt.current = now;
      next = proposed;
    }
  }
  const settled = Math.abs(camera.position.z - pose.camera[2]) < 0.01;
  if (!settled) heroBridge.invalidate();
  return next;
}
