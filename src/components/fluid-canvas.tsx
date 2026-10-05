"use client";

import { useEffect, useRef } from "react";

type FluidWindow = Window & { bootFluid?: (canvas: HTMLCanvasElement) => void };

let loading: Promise<void> | null = null;

function loadFluid() {
  if ((window as FluidWindow).bootFluid) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/fluid/webgl-fluid.js";
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("fluid failed to load"));
    };
    document.body.appendChild(script);
  });
  return loading;
}

export function FluidCanvas({ id, className }: { id: string; className: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let live = true;
    loadFluid()
      .then(() => {
        if (live && canvas.current) (window as FluidWindow).bootFluid?.(canvas.current);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return <canvas ref={canvas} id={id} className={className} aria-hidden="true" />;
}
