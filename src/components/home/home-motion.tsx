"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ScrollHero } from "./scroll-hero";

export function HomeExperience({
  storeName,
  heading,
  stackImages,
  children,
}: {
  storeName: string;
  heading: string;
  stackImages: string[];
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("home-motion");
    const nodes = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    const reveal = (element: HTMLElement) => element.classList.add("is-in");
    const markVisible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) reveal(element);
    };
    const footer = document.querySelector("footer.site-footer");
    const footerShell = footer?.querySelector(":scope > .shell");
    let observer: IntersectionObserver | undefined;
    let footerObserver: IntersectionObserver | undefined;
    try {
      if (!("IntersectionObserver" in window)) {
        nodes.forEach(reveal);
        if (footerShell instanceof HTMLElement) reveal(footerShell);
      } else {
        nodes.forEach(markVisible);
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) entry.target.classList.add("is-in");
            }
          },
          { threshold: 0.2 },
        );
        nodes.forEach((node) => observer?.observe(node));
        if (footerShell instanceof HTMLElement) {
          footerShell.classList.add("home-footer-reveal");
          markVisible(footerShell);
          footerObserver = new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) footerShell.classList.add("is-in");
            },
            { threshold: 0.2 },
          );
          footerObserver.observe(footerShell);
        }
      }
    } catch {
      nodes.forEach(reveal);
      if (footerShell instanceof HTMLElement) reveal(footerShell);
    }
    const safety = window.setTimeout(() => {
      for (const node of nodes) markVisible(node);
      if (footerShell instanceof HTMLElement) markVisible(footerShell);
    }, 1200);

    return () => {
      window.clearTimeout(safety);
      observer?.disconnect();
      footerObserver?.disconnect();
      if (footerShell instanceof HTMLElement) footerShell.classList.remove("home-footer-reveal", "is-in");
      root.classList.remove("home-motion");
    };
  }, []);

  return (
    <div ref={rootRef}>
      <ScrollHero storeName={storeName} heading={heading} stackImages={stackImages} />
      {children}
    </div>
  );
}
