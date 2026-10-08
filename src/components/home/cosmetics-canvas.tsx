"use client";

import { Canvas } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PCFShadowMap, SRGBColorSpace, type WebGLRenderer } from "three";
import { CosmeticsScene } from "./cosmetics-scene";
import { heroBridge } from "./hero-bridge";
import { detectQuality } from "./quality";
import { castShadows, narrowBreak, pixelRatioCap, type QualityTier } from "./scene-config";

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function CosmeticsCanvas({ onFail, onReady, ready }: { onFail: () => void; onReady: () => void; ready: boolean }) {
  const failRef = useRef(onFail);
  const readyRef = useRef(onReady);
  useEffect(() => {
    failRef.current = onFail;
    readyRef.current = onReady;
  }, [onFail, onReady]);
  const [support] = useState(detectQuality);
  const [tier, setTier] = useState<QualityTier>(() => (support === "fallback" ? "low" : support));
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < narrowBreak);
  const [antialias] = useState(() => support !== "fallback" && support !== "low");

  useEffect(() => {
    if (support === "fallback") failRef.current();
  }, [support]);

  useEffect(() => {
    if (support === "fallback") return;
    const media = window.matchMedia(`(max-width: ${narrowBreak - 1}px)`);
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [support]);

  const shadows = castShadows(tier, narrow);
  const dprMax = pixelRatioCap(tier, narrow);
  const gl = useMemo(
    () => ({
      antialias,
      alpha: true,
      powerPreference: "high-performance" as const,
      failIfMajorPerformanceCaveat: false,
    }),
    [antialias],
  );

  if (support === "fallback") return <div className="cosmetics-canvas" aria-hidden />;

  return (
    <div className={ready ? "cosmetics-canvas is-ready" : "cosmetics-canvas"} aria-hidden>
      <Canvas
        dpr={[1, dprMax]}
        frameloop="demand"
        shadows={shadows}
        resize={{ scroll: false, debounce: 0 }}
        camera={{ fov: 32, position: [0.04, 0.86, 5.45], near: 0.05, far: 30 }}
        gl={gl}
        style={{
          pointerEvents: "none",
          background: "transparent",
          width: "100%",
          height: "100%",
        }}
        onCreated={({ gl: renderer }) => {
          prepareRenderer(renderer);
          renderer.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            failRef.current();
          });
        }}
      >
        <SceneBoundary onError={() => failRef.current()}>
          <CosmeticsScene tier={tier} shadows={shadows} onTier={setTier} onReady={() => readyRef.current()} />
        </SceneBoundary>
      </Canvas>
    </div>
  );
}

function prepareRenderer(gl: WebGLRenderer) {
  gl.outputColorSpace = SRGBColorSpace;
  gl.shadowMap.type = PCFShadowMap;
  gl.setClearColor(0x000000, 0);
  gl.domElement.style.background = "transparent";
  gl.domElement.style.pointerEvents = "none";
}

export function readSceneStats() {
  return {
    tier: heroBridge.tier,
    frameMs: heroBridge.frameMs,
    calls: heroBridge.calls,
    triangles: heroBridge.triangles,
  };
}
