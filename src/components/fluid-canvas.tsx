"use client";

import { useEffect, useRef } from "react";
import { narrowBreak } from "./home/scene-config";

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

function replaceCanvas(current: HTMLCanvasElement) {
  const fresh = current.cloneNode(false);
  if (!(fresh instanceof HTMLCanvasElement)) return current;
  current.replaceWith(fresh);
  return fresh;
}

function applyFluidCap(node: HTMLCanvasElement, narrow: boolean) {
  if (narrow) node.dataset.dprCap = "1";
  else delete node.dataset.dprCap;
}

export function FluidCanvas({ id, className }: { id: string; className: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const narrow = window.matchMedia(`(max-width: ${narrowBreak - 1}px)`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let live = true;

    const stop = () => {
      const current = canvas.current;
      if (!current?.isConnected) return;
      canvas.current = replaceCanvas(current);
    };

    const start = () => {
      const node = canvas.current;
      if (!live || reduce.matches || document.hidden || !node) return;
      applyFluidCap(node, narrow.matches);
      loadFluid()
        .then(() => {
          const next = canvas.current;
          if (!live || reduce.matches || document.hidden || !next) return;
          applyFluidCap(next, narrow.matches);
          (window as FluidWindow).bootFluid?.(next);
        })
        .catch(() => {});
    };

    const onChange = () => {
      const node = canvas.current;
      if (node) applyFluidCap(node, narrow.matches);
      if (reduce.matches || document.hidden) stop();
      else start();
    };

    start();
    narrow.addEventListener("change", onChange);
    reduce.addEventListener("change", onChange);
    document.addEventListener("visibilitychange", onChange);
    return () => {
      live = false;
      narrow.removeEventListener("change", onChange);
      reduce.removeEventListener("change", onChange);
      document.removeEventListener("visibilitychange", onChange);
      stop();
    };
  }, []);

  return <canvas ref={canvas} id={id} className={className} aria-hidden="true" />;
}
