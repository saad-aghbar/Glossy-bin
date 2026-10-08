"use client";

import { useEffect, useState } from "react";
import { PlateImage } from "@/components/ui";

export type RibbonSlide = {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  buttonLabel: string;
};

export function ImageRibbon({ slides }: { slides: RibbonSlide[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(`[data-ribbon="${openId}"]`)) setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openId]);

  const [still, setStill] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (slides.length === 0) return null;
  const track = still ? slides : [...slides, ...slides];

  return (
    <section className="image-ribbon" aria-label="شريط الصور">
      <div className="image-ribbon-window">
      <div className="image-ribbon-track">
        {track.map((slide, index) => {
          const copy = index >= slides.length;
          return (
            <article
              key={`${slide.id}-${index}`}
              className={openId === slide.id ? "image-ribbon-tile is-open" : "image-ribbon-tile"}
              data-ribbon={slide.id}
              aria-hidden={copy || undefined}
              onPointerUp={(event) => {
                if (event.pointerType === "mouse") return;
                if ((event.target as HTMLElement).closest("a")) return;
                setOpenId(slide.id);
              }}
            >
              <PlateImage src={slide.imageUrl} alt="" bare sizes="(max-width: 767px) 68vw, 16rem" className="image-ribbon-img" />
              <a className="image-ribbon-go" href={slide.linkUrl || "/products"} tabIndex={copy ? -1 : undefined}>
                {slide.buttonLabel}
              </a>
            </article>
          );
        })}
      </div>
      </div>
    </section>
  );
}
