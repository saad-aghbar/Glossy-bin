"use client";

import { useLayoutEffect, type RefObject } from "react";

const margin = 8;

function pin(anchor: HTMLElement) {
  const pop = anchor.querySelector<HTMLElement>(":scope > .pop, :scope > .shop-drop, :scope > .admin-drop");
  if (!pop) return;
  pop.style.position = "absolute";
  pop.style.top = "calc(100% + 0.35rem)";
  pop.style.paddingTop = "0";
  pop.style.right = "auto";
  pop.style.left = "auto";
  pop.style.insetInlineStart = "0";
  pop.style.insetInlineEnd = "auto";
  pop.style.width = "max-content";
  pop.style.minWidth = "100%";
  pop.style.maxWidth = `calc(100vw - ${margin * 2}px)`;
  pop.style.translate = "0 0";
  const rect = pop.getBoundingClientRect();
  let shift = 0;
  if (rect.left < margin) shift = margin - rect.left;
  if (rect.right + shift > window.innerWidth - margin) {
    shift -= rect.right + shift - (window.innerWidth - margin);
  }
  if (rect.left + shift < margin) shift = margin - rect.left;
  pop.style.translate = `${shift}px 0`;
}

function clearPin(anchor: HTMLElement | null) {
  const pop = anchor?.querySelector<HTMLElement>(":scope > .pop, :scope > .shop-drop, :scope > .admin-drop");
  if (!pop) return;
  pop.style.position = "";
  pop.style.top = "";
  pop.style.paddingTop = "";
  pop.style.right = "";
  pop.style.left = "";
  pop.style.insetInlineStart = "";
  pop.style.insetInlineEnd = "";
  pop.style.width = "";
  pop.style.minWidth = "";
  pop.style.maxWidth = "";
  pop.style.translate = "";
}

export function usePinnedPopover(open: boolean, anchorRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!open || !anchor) return;
    const place = () => pin(anchor);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      clearPin(anchor);
    };
  }, [open, anchorRef]);
}
