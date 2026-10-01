"use client";

import { Suspense, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { type Group, type PerspectiveCamera } from "three";
import { heroBridge } from "./hero-bridge";
import { ProductModel, modelUrls } from "./product-model";
import { productLayout, productScale, sceneColors, tierDetail, type QualityTier } from "./scene-config";
import { stepScene } from "./scene-frame";
import { mountStudioEnvironment } from "./studio";

export function CosmeticsScene({
  tier,
  onTier,
}: {
  tier: QualityTier;
  onTier: (tier: QualityTier) => void;
}) {
  const lipstick = useRef<Group>(null);
  const root = useRef<Group>(null);
  const lipstickMixer = useRef<{ setTime: (time: number) => void } | null>(null);
  const compactMixer = useRef<{ setTime: (time: number) => void } | null>(null);
  const glossMixer = useRef<{ setTime: (time: number) => void } | null>(null);
  const snapped = useRef(false);
  const samples = useRef<number[]>([]);
  const switchedAt = useRef(0);
  const { camera, size, invalidate, gl, scene } = useThree();
  const detail = tierDetail[tier];

  useEffect(() => {
    heroBridge.invalidate = () => invalidate();
    heroBridge.tier = tier;
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      canvas.dispatchEvent(new CustomEvent("glossy-webgl-lost"));
    };
    canvas.addEventListener("webglcontextlost", lost);
    const releaseEnvironment = detail.environment ? mountStudioEnvironment(gl, scene) : undefined;
    invalidate();
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      releaseEnvironment?.();
      heroBridge.invalidate = () => {};
    };
  }, [detail.environment, gl, invalidate, scene, tier]);

  useFrame((_, delta) => {
    const next = stepScene({
      camera: camera as PerspectiveCamera,
      delta,
      narrow: size.width < 800,
      tier,
      renderer: gl,
      root: root.current,
      lipstick: lipstick.current,
      lipstickMixer: lipstickMixer.current,
      compactMixer: compactMixer.current,
      glossMixer: glossMixer.current,
      samples: samples.current,
      snapped,
      switchedAt,
    });
    if (next !== tier) onTier(next);
  });

  return (
    <>
      <color attach="background" args={[sceneColors.background]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[2.4, 4.2, 2.2]}
        intensity={2.1}
        castShadow={detail.shadow}
        shadow-mapSize-width={detail.shadow ? 1024 : 256}
        shadow-mapSize-height={detail.shadow ? 1024 : 256}
      />
      <directionalLight position={[-2.4, 1.8, 1.4]} intensity={0.45} color="#f3e0e4" />
      <directionalLight position={[0, 1.2, -2.5]} intensity={0.35} />
      <Suspense fallback={null}>
        <group ref={root}>
          <group ref={lipstick} position={productLayout.lipstick} scale={productScale}>
            <ProductModel url={modelUrls.lipstick} clip="Reveal" castShadow={detail.shadow} mixerRef={lipstickMixer} />
          </group>
          <group position={productLayout.compact} scale={productScale}>
            <ProductModel url={modelUrls.compact} clip="Open" castShadow={detail.shadow} mixerRef={compactMixer} />
          </group>
          <group position={productLayout.gloss} scale={productScale}>
            <ProductModel url={modelUrls.gloss} clip="Extract" castShadow={detail.shadow} mixerRef={glossMixer} />
          </group>
        </group>
      </Suspense>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} receiveShadow>
        <circleGeometry args={[2.4, tier === "low" ? 24 : 48]} />
        <shadowMaterial opacity={0.22} />
      </mesh>
    </>
  );
}
