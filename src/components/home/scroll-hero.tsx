"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { heroBridge } from "./hero-bridge";
import { heroProgress, measureStableStage, shouldRefreshStage } from "./hero-geometry";
import { heroMotionLocked, readHeroPreference, setHeroStill, subscribeHeroPreference } from "./hero-preference";
import { heroCopy, heroLength } from "./scene-config";

const SCENE_TIMEOUT_MS = 12000;

const CosmeticsCanvas = dynamic(() => import("./cosmetics-canvas").then((mod) => mod.CosmeticsCanvas), {
  ssr: false,
});

const StaticHero = dynamic(() => import("./static-hero").then((mod) => mod.StaticHero), {
  ssr: false,
});

export function ScrollHero({
  storeName,
  heading,
  stackImages,
}: {
  storeName: string;
  heading: string;
  stackImages: string[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const preference = useSyncExternalStore(subscribeHeroPreference, readHeroPreference, () => "scene" as const);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [mountScene, setMountScene] = useState(false);
  const mode = failed ? "failed" : preference;

  useEffect(() => {
    if (mode !== "scene") return;
    const frame = requestAnimationFrame(() => setMountScene(true));
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  useEffect(() => {
    if (mode !== "scene" || !mountScene || ready) return;
    const timer = window.setTimeout(() => setFailed(true), SCENE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [mode, mountScene, ready]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky || mode !== "scene") return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    heroBridge.allowPointer = finePointer.matches;
    let frame = 0;
    let follow = 0;
    let measure = false;
    let lockedWidth = window.innerWidth;
    let lockedStage = 0;

    const refreshStage = () => {
      const nextWidth = window.innerWidth;
      const nextStage = measureStableStage();
      if (
        shouldRefreshStage({
          previousWidth: lockedWidth,
          nextWidth,
          previousStage: lockedStage,
          nextStage,
          finePointer: finePointer.matches,
        })
      ) {
        section.style.setProperty("--hero-stage", `${nextStage}px`);
        lockedStage = nextStage;
      }
      lockedWidth = nextWidth;
    };

    const update = () => {
      const rect = section.getBoundingClientRect();
      const stage = sticky.offsetHeight;
      const progress = heroProgress(window.scrollY, rect.top + window.scrollY, section.offsetHeight, stage);
      heroBridge.progress = progress;
      section.style.setProperty("--p", progress.toFixed(4));
      section.toggleAttribute("data-mid", progress > 0.2 && progress < 0.72);
      section.toggleAttribute("data-end", progress > 0.72);
      const header = document.querySelector(".site-header");
      if (header instanceof HTMLElement) header.dataset.tone = progress > 0.92 ? "shop" : "hero";
      heroBridge.playing = rect.bottom > 0 && rect.top < stage && document.visibilityState === "visible";
      if (heroBridge.playing) heroBridge.invalidate();
    };

    const schedule = (remeasure = false) => {
      measure = measure || remeasure;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const shouldMeasure = measure;
        measure = false;
        if (shouldMeasure) refreshStage();
        update();
      });
    };

    const onPointer = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType !== "mouse") return;
      const rect = section.getBoundingClientRect();
      heroBridge.pointerX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      heroBridge.pointerY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      heroBridge.invalidate();
    };

    const onHide = () => {
      heroBridge.playing = document.visibilityState === "visible" && section.getBoundingClientRect().bottom > 0;
      if (heroBridge.playing) heroBridge.invalidate();
    };

    const onScroll = () => schedule();
    const onGeometry = () => schedule(true);
    const onOrientation = () => {
      schedule(true);
      if (follow) cancelAnimationFrame(follow);
      follow = requestAnimationFrame(() => {
        follow = 0;
        schedule(true);
      });
    };

    refreshStage();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onGeometry, { passive: true });
    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (follow) cancelAnimationFrame(follow);
      heroBridge.playing = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onGeometry);
      window.removeEventListener("orientationchange", onOrientation);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onHide);
      const header = document.querySelector(".site-header");
      if (header instanceof HTMLElement) delete header.dataset.tone;
    };
  }, [mode]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || mode === "scene") return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let lockedWidth = window.innerWidth;
    let lockedStage = 0;

    const refreshStage = () => {
      const nextWidth = window.innerWidth;
      const nextStage = measureStableStage();
      if (
        shouldRefreshStage({
          previousWidth: lockedWidth,
          nextWidth,
          previousStage: lockedStage,
          nextStage,
          finePointer: finePointer.matches,
        })
      ) {
        section.style.setProperty("--hero-stage", `${nextStage}px`);
        lockedStage = nextStage;
      }
      lockedWidth = nextWidth;
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        refreshStage();
      });
    };

    refreshStage();
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [mode]);

  const restore = heroMotionLocked()
    ? undefined
    : () => {
        setFailed(false);
        setReady(false);
        setMountScene(false);
        setHeroStill(false);
      };

  if (mode !== "scene") {
    return (
      <section ref={sectionRef} className="scroll-hero is-still" aria-label="مقدمة المتجر">
        <StaticHero
          storeName={storeName}
          heading={heading}
          images={stackImages}
          onRestore={heroMotionLocked() ? undefined : mode === "still" ? () => setHeroStill(false) : restore}
        />
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="scroll-hero"
      aria-label="مقدمة المتجر"
      style={{ "--hero-mobile": heroLength.mobile, "--hero-desktop": heroLength.desktop } as CSSProperties}
    >
      <div ref={stickyRef} className="scroll-hero-sticky">
        {mountScene ? (
          <CosmeticsCanvas
            ready={ready}
            onReady={() => setReady(true)}
            onFail={() => setFailed(true)}
          />
        ) : null}
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
          <div className="hero-actions">
            <a className="hero-skip" href="#shop">
              {heroCopy.skip}
            </a>
            <button className="hero-still" type="button" onClick={() => setHeroStill(true)}>
              {heroCopy.still}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
