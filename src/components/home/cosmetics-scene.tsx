"use client";

import { Suspense, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { type Group, type PerspectiveCamera } from "three";
import { heroBridge } from "./hero-bridge";
import { ProductModel, modelUrls } from "./product-model";
import { narrowBreak, productLayout, productScale, tierDetail, type QualityTier } from "./scene-config";
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
  const compact = useRef<Group>(null);
  const gloss = useRef<Group>(null);
  const root = useRef<Group>(null);
  const lipstickMixer = useRef<{ setTime: (time: number) => void } | null>(null);
  const compactMixer = useRef<{ setTime: (time: number) => void } | null>(null);
  const glossMixer = useRef<{ setTime: (time: number) => void } | null>(null);
  const snapped = useRef(false);
  const samples = useRef<number[]>([]);
  const switchedAt = useRef(0);
  const { camera, invalidate, gl, scene, setSize } = useThree();
  const detail = tierDetail[tier];

  useEffect(() => {
    const host = gl.domElement.closest(".cosmetics-canvas");
    if (!(host instanceof HTMLElement)) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width && height) setSize(width, height);
  }, [gl, setSize]);

  useEffect(() => {
    heroBridge.invalidate = () => invalidate();
    heroBridge.tier = tier;
    let release = mountStudioEnvironment(gl, scene);
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      canvas.dispatchEvent(new CustomEvent("glossy-webgl-lost"));
    };
    const restored = () => {
      release();
      release = mountStudioEnvironment(gl, scene);
      invalidate();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    invalidate();
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      release();
      heroBridge.invalidate = () => {};
    };
  }, [gl, invalidate, scene, tier]);

  useFrame((_, delta) => {
    const next = stepScene({
      camera: camera as PerspectiveCamera,
      delta,
      narrow: window.innerWidth < narrowBreak,
      tier,
      renderer: gl,
      root: root.current,
      lipstick: lipstick.current,
      compact: compact.current,
      gloss: gloss.current,
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
          <group ref={compact} position={productLayout.compact} scale={productScale}>
            <ProductModel url={modelUrls.compact} clip="Open" castShadow={detail.shadow} mixerRef={compactMixer} />
          </group>
          <group ref={gloss} position={productLayout.gloss} scale={productScale}>
            <ProductModel url={modelUrls.gloss} clip="Extract" castShadow={detail.shadow} mixerRef={glossMixer} />
          </group>
        </group>
      </Suspense>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} receiveShadow>
        <circleGeometry args={[2.8, tier === "low" ? 24 : 48]} />
        <shadowMaterial opacity={0.18} />
      </mesh>
    </>
  );
}
