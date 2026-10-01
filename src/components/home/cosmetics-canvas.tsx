"use client";

import { Canvas } from "@react-three/fiber";
import { Component, useEffect, useState, type ReactNode } from "react";
import { PCFShadowMap, SRGBColorSpace } from "three";
import { CosmeticsScene } from "./cosmetics-scene";
import { heroBridge } from "./hero-bridge";
import { detectQuality } from "./quality";
import { tierDetail, type QualityTier } from "./scene-config";

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

class SupportGate extends Component<{ children: ReactNode; onFail: () => void }, { ok: boolean }> {
  state = { ok: true };

  componentDidMount() {
    if (detectQuality() === "fallback") {
      this.setState({ ok: false });
      this.props.onFail();
    }
  }

  render() {
    return this.state.ok ? this.props.children : null;
  }
}

function pixelRatioCap(tier: QualityTier, width: number) {
  const max = tierDetail[tier].dprMax;
  return width < 800 ? Math.min(max, 1.5) : max;
}

export function CosmeticsCanvas({ onFail }: { onFail: () => void }) {
  const [tier, setTier] = useState<QualityTier>(() => {
    const detected = detectQuality();
    return detected === "fallback" ? "low" : detected;
  });
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const detail = tierDetail[tier];
  const dprMax = pixelRatioCap(tier, width);

  return (
    <SceneBoundary onError={onFail}>
      <SupportGate onFail={onFail}>
        <Canvas
          className="cosmetics-canvas"
          aria-hidden
          dpr={[1, dprMax]}
          frameloop="demand"
          shadows={detail.shadow}
          camera={{ fov: 32, position: [0.06, 0.72, 4.45], near: 0.05, far: 30 }}
          gl={{
            antialias: tier !== "low",
            alpha: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
          style={{ pointerEvents: "none" }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = SRGBColorSpace;
            gl.shadowMap.type = PCFShadowMap;
            gl.setClearColor("#f6f1ea");
            gl.domElement.style.pointerEvents = "none";
            gl.domElement.addEventListener("webglcontextlost", (event) => {
              event.preventDefault();
              onFail();
            });
          }}
        >
          <CosmeticsScene tier={tier} onTier={setTier} />
        </Canvas>
      </SupportGate>
    </SceneBoundary>
  );
}

export function readSceneStats() {
  return {
    tier: heroBridge.tier,
    frameMs: heroBridge.frameMs,
    calls: heroBridge.calls,
    triangles: heroBridge.triangles,
  };
}
