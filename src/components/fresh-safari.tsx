"use client";

import { useEffect } from "react";

export function FreshSafari() {
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let seen = "";
    let timer = 0;
    const look = async () => {
      try {
        const response = await fetch("/api/dev-build", { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.text();
        if (seen && seen !== next) window.location.reload();
        seen = next;
      } catch {
        return;
      }
    };
    void look();
    timer = window.setInterval(() => void look(), 2000);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
