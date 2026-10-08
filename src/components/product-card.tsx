"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QuickView } from "@/components/quick-view";
import { PlateImage } from "@/components/ui";
import { formatMinor } from "@/lib/money";

export function ProductCard({
  slug,
  href,
  name,
  imageUrl,
  imageAlt,
  category,
  priceMinor,
  compareAtMinor,
  currency,
  minorUnit,
  inStock,
}: {
  slug: string;
  href: string;
  name: string;
  imageUrl: string | null;
  imageAlt: string;
  category?: string | null;
  priceMinor: number | null;
  compareAtMinor?: number | null;
  currency: string;
  minorUnit: number;
  inStock: boolean;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const [hover, setHover] = useState(false);
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const onSale = compareAtMinor != null && priceMinor != null && compareAtMinor > priceMinor;

  useEffect(() => {
    setHost(document.querySelector<HTMLElement>(".shop-app"));
  }, []);

  useEffect(() => {
    if (!hover) return;
    function place() {
      const node = anchor.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const width = 224;
      const gap = 12;
      let left = rect.left > width + gap ? rect.left - width - gap : rect.right + gap;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const top = Math.max(12, Math.min(rect.top, window.innerHeight - 280));
      setBox({ top, left });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [hover]);

  function showPeek() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (timer.current) window.clearTimeout(timer.current);
    setHover(true);
  }

  function hidePeek() {
    timer.current = window.setTimeout(() => setHover(false), 140);
  }

  const peek =
    hover && !open && host && box
      ? createPortal(
          <button
            type="button"
            className="card product-peek"
            style={{ top: box.top, left: box.left }}
            onMouseEnter={showPeek}
            onMouseLeave={hidePeek}
            onClick={() => {
              setHover(false);
              setOpen(true);
            }}
          >
            <span className="product-peek-photo">
              <PlateImage src={imageUrl} alt="" bare className="product-peek-img" />
            </span>
            {category ? <span className="product-kicker">{category}</span> : null}
            <span className="product-peek-name">{name}</span>
            {priceMinor != null ? (
              <span className="price">
                {onSale ? <s>{formatMinor(compareAtMinor, currency, minorUnit)}</s> : null}
                <span>{formatMinor(priceMinor, currency, minorUnit)}</span>
              </span>
            ) : null}
          </button>,
          host,
        )
      : null;

  return (
    <div
      ref={anchor}
      className="product-tile-wrap"
      onMouseEnter={showPeek}
      onMouseLeave={hidePeek}
    >
      <button type="button" className="product-tile" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <p className="product-kicker">{category}</p>
        <div className="product-photo">
          <PlateImage src={imageUrl} alt={imageAlt || name} bare className="product-photo-img" />
        </div>
        <div className="product-copy">
          <h2>{name}</h2>
          {priceMinor != null ? (
            <p className="price">
              {onSale ? <s>{formatMinor(compareAtMinor, currency, minorUnit)}</s> : null}
              <span>{formatMinor(priceMinor, currency, minorUnit)}</span>
            </p>
          ) : null}
          {inStock ? null : <p className="product-stock">نفد</p>}
        </div>
      </button>
      {peek}
      {open ? (
        <QuickView slug={slug} href={href} currency={currency} minorUnit={minorUnit} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}
