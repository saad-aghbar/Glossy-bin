"use client";

import { Canvas } from "@react-three/fiber";
import { Component, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PCFShadowMap, SRGBColorSpace } from "three";
import { CosmeticsScene } from "./cosmetics-scene";
import { heroBridge } from "./hero-bridge";
import { detectQuality } from "./quality";
import { narrowBreak, tierDetail, type QualityTier } from "./scene-config";

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
  return width < narrowBreak ? Math.min(max, 1.5) : max;
}

export function CosmeticsCanvas({ onFail }: { onFail: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<QualityTier>(() => {
    const detected = detectQuality();
    return detected === "fallback" ? "low" : detected;
  });
  const [box, setBox] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const node = host.current;
    if (!node) return;
    const sync = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (!width || !height) return;
      setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const detail = tierDetail[tier];
  const dprMax = pixelRatioCap(tier, box.width || (typeof window === "undefined" ? 1280 : window.innerWidth));

  return (
    <div ref={host} className="cosmetics-canvas" aria-hidden>
      {box.width > 0 && box.height > 0 ? (
        <SceneBoundary onError={onFail}>
          <SupportGate onFail={onFail}>
            <Canvas
              key={`${box.width}x${box.height}`}
              dpr={[1, dprMax]}
              frameloop="always"
              shadows={detail.shadow}
              resize={{ scroll: false, debounce: 0 }}
              camera={{ fov: 32, position: [0.04, 0.86, 5.45], near: 0.05, far: 30 }}
              gl={{
                antialias: tier !== "low",
                alpha: true,
                powerPreference: "high-performance",
                failIfMajorPerformanceCaveat: false,
              }}
              style={{
                pointerEvents: "none",
                background: "transparent",
                width: box.width,
                height: box.height,
              }}
              onCreated={({ gl, setSize }) => {
                gl.outputColorSpace = SRGBColorSpace;
                gl.shadowMap.type = PCFShadowMap;
                gl.setClearColor(0x000000, 0);
                setSize(box.width, box.height);
                gl.setSize(box.width, box.height, false);
                gl.domElement.style.background = "transparent";
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
      ) : null}
    </div>
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
