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
    const nodes = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const markVisible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) element.classList.add("is-in");
    };
    nodes.forEach(markVisible);
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-in"));
      return () => {
        root.classList.remove("home-motion");
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("is-in");
        }
      },
      { threshold: 0.2 },
    );
    nodes.forEach((node) => observer.observe(node));

    const footer = document.querySelector("footer.site-footer");
    const footerShell = footer?.querySelector(":scope > .shell");
    let footerObserver: IntersectionObserver | undefined;
    if (footerShell instanceof HTMLElement) {
      footerShell.classList.add("home-footer-reveal");
      const rect = footerShell.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) footerShell.classList.add("is-in");
      footerObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) footerShell.classList.add("is-in");
        },
        { threshold: 0.2 },
      );
      footerObserver.observe(footerShell);
    }

    return () => {
      observer.disconnect();
      footerObserver?.disconnect();
      footerShell?.classList.remove("home-footer-reveal", "is-in");
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
