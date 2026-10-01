"use client";

import { useLoader } from "@react-three/fiber";
import { useLayoutEffect, useMemo, type MutableRefObject } from "react";
import { AnimationMixer, LoopOnce, type AnimationAction, type Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const modelUrls = {
  lipstick: "/models/glossy/glossy-lipstick.glb",
  compact: "/models/glossy/glossy-compact.glb",
  gloss: "/models/glossy/glossy-lip-gloss.glb",
} as const;

for (const url of Object.values(modelUrls)) {
  useLoader.preload(GLTFLoader, url);
}

export function ProductModel({
  url,
  clip,
  castShadow,
  mixerRef,
}: {
  url: string;
  clip: string;
  castShadow: boolean;
  mixerRef: MutableRefObject<{ setTime: (time: number) => void } | null>;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const model = useMemo(() => gltf.scene.clone(true), [gltf]);

  useLayoutEffect(() => {
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = castShadow;
    });
  }, [castShadow, model]);

  useLayoutEffect(() => {
    const mixer = new AnimationMixer(model);
    const source = gltf.animations.find((item) => item.name === clip) ?? gltf.animations[0];
    const action: AnimationAction = mixer.clipAction(source);
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.enabled = true;
    action.play();
    const setTime = (time: number) => {
      action.paused = false;
      action.enabled = true;
      mixer.setTime(time);
    };
    setTime(0);
    mixerRef.current = { setTime };
    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [clip, gltf, mixerRef, model]);

  return <primitive object={model} />;
}
