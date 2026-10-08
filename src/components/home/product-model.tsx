"use client";

import { useLoader } from "@react-three/fiber";
import { useLayoutEffect, useMemo, type MutableRefObject } from "react";
import { AnimationMixer, LoopOnce, type AnimationAction, type Material, type Mesh, type Object3D } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { findClip, isGlbPayload } from "./model-bytes";

export const modelUrls = {
  lipstick: "/models/glossy/glossy-lipstick.glb",
  compact: "/models/glossy/glossy-compact.glb",
  gloss: "/models/glossy/glossy-lip-gloss.glb",
} as const;

class GuardedGLTFLoader extends GLTFLoader {
  parse(data: ArrayBuffer | string, path: string, onLoad: (gltf: GLTF) => void, onError?: (event: ErrorEvent) => void) {
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
    if (!isGlbPayload(bytes)) {
      onError?.(new ErrorEvent("error", { message: "Expected a GLB model" }));
      return;
    }
    super.parse(data, path, onLoad, onError);
  }
}

for (const url of Object.values(modelUrls)) {
  useLoader.preload(GuardedGLTFLoader, url);
}

function cloneModel(source: Object3D) {
  const model = source.clone(true);
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry = mesh.geometry.clone();
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((material) => material.clone()) : mesh.material.clone();
  });
  return model;
}

function disposeModel(model: Object3D) {
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[];
    for (const material of materials) material.dispose();
  });
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
  const gltf = useLoader(GuardedGLTFLoader, url);
  const model = useMemo(() => cloneModel(gltf.scene), [gltf]);

  useLayoutEffect(() => {
    model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = castShadow;
    });
  }, [castShadow, model]);

  useLayoutEffect(() => {
    return () => disposeModel(model);
  }, [model]);

  useLayoutEffect(() => {
    const mixer = new AnimationMixer(model);
    const source = findClip(gltf.animations, clip);
    if (!source) {
      mixerRef.current = { setTime: () => {} };
      return () => {
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
        mixerRef.current = null;
      };
    }
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
      mixer.uncacheRoot(model);
      mixerRef.current = null;
    };
  }, [clip, gltf, mixerRef, model]);

  return <primitive object={model} />;
}
