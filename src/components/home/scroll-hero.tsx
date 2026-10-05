"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { heroBridge } from "./hero-bridge";
import { heroMotionLocked, readHeroPreference, setHeroStill, subscribeHeroPreference } from "./hero-preference";
import { heroCopy, heroLength } from "./scene-config";
import { StaticHero } from "./static-hero";

const CosmeticsCanvas = dynamic(() => import("./cosmetics-canvas").then((mod) => mod.CosmeticsCanvas), {
  ssr: false,
});

export function ScrollHero({ storeName, heading }: { storeName: string; heading: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const preference = useSyncExternalStore(subscribeHeroPreference, readHeroPreference, () => "scene" as const);
  const [failed, setFailed] = useState(false);
  const mode = failed ? "failed" : preference;

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || mode !== "scene") return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    heroBridge.allowPointer = fine;

    const update = () => {
      const distance = section.offsetHeight - window.innerHeight;
      const passed = Math.min(Math.max(-section.getBoundingClientRect().top, 0), Math.max(distance, 0));
      const progress = distance > 0 ? passed / distance : 0;
      heroBridge.progress = progress;
      section.style.setProperty("--p", progress.toFixed(4));
      section.toggleAttribute("data-mid", progress > 0.2 && progress < 0.72);
      section.toggleAttribute("data-end", progress > 0.72);
      const header = document.querySelector(".site-header");
      if (header instanceof HTMLElement) header.dataset.tone = progress > 0.92 ? "shop" : "hero";
      const visible = section.getBoundingClientRect().bottom > 0 && section.getBoundingClientRect().top < window.innerHeight;
      heroBridge.playing = visible && document.visibilityState === "visible";
      if (heroBridge.playing) heroBridge.invalidate();
    };

    const onScroll = () => {
      update();
    };

    const onPointer = (event: PointerEvent) => {
      if (!fine || event.pointerType !== "mouse") return;
      const rect = section.getBoundingClientRect();
      heroBridge.pointerX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      heroBridge.pointerY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      heroBridge.invalidate();
    };

    const onHide = () => {
      heroBridge.playing = document.visibilityState === "visible";
      if (heroBridge.playing) heroBridge.invalidate();
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onHide);
      const header = document.querySelector(".site-header");
      if (header instanceof HTMLElement) delete header.dataset.tone;
    };
  }, [mode]);

  if (mode !== "scene") {
    return (
      <section className="scroll-hero is-still" aria-label="مقدمة المتجر">
        <StaticHero storeName={storeName} heading={heading} />
        {mode === "still" && !heroMotionLocked() ? (
          <button
            className="hero-still"
            type="button"
            onClick={() => {
              setFailed(false);
              setHeroStill(false);
            }}
          >
            {heroCopy.motion}
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="scroll-hero"
      aria-label="مقدمة المتجر"
      style={{ "--hero-mobile": heroLength.mobile, "--hero-desktop": heroLength.desktop, "--p": 0 } as CSSProperties}
    >
      <div className="scroll-hero-sticky">
        <CosmeticsCanvas onFail={() => setFailed(true)} />
        <div className="scroll-hero-copy">
          <div className="phase-open">
            <h1>{storeName}</h1>
            <a className="btn btn-primary" href="#shop">
              {heroCopy.shop}
            </a>
          </div>
          <p className="phase-mid">{heading}</p>
          <div className="phase-end">
            <p>{heroCopy.ending}</p>
            <a className="btn btn-primary" href="#shop">
              {heroCopy.shop}
            </a>
          </div>
          <a className="hero-skip" href="#shop">
            {heroCopy.skip}
          </a>
          <button
            className="hero-still"
            type="button"
            onClick={() => setHeroStill(true)}
          >
            {heroCopy.still}
          </button>
        </div>
      </div>
    </section>
  );
}
