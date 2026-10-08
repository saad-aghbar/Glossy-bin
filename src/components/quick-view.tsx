"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProductPurchase } from "@/components/product-purchase";
import { loadQuickView } from "@/server/actions/quick-view";

type QuickProduct = Awaited<ReturnType<typeof loadQuickView>>;

function freezePage(dialog: HTMLElement) {
  const html = document.documentElement;
  const body = document.body;
  const scrollY = window.scrollY;
  const previous = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
  };
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";

  let lastTouchY = 0;

  function blocksPage(event: Event, deltaY: number) {
    const target = event.target;
    if (!(target instanceof Node) || !dialog.contains(target)) return true;
    if (dialog.scrollHeight <= dialog.clientHeight + 1) return true;
    const atTop = dialog.scrollTop <= 0;
    const atBottom = dialog.scrollTop + dialog.clientHeight >= dialog.scrollHeight - 1;
    if (deltaY < 0 && atTop) return true;
    if (deltaY > 0 && atBottom) return true;
    return false;
  }

  function onTouchStart(event: TouchEvent) {
    lastTouchY = event.touches[0]?.clientY ?? 0;
  }

  function onTouchMove(event: TouchEvent) {
    const y = event.touches[0]?.clientY ?? lastTouchY;
    const deltaY = lastTouchY - y;
    if (blocksPage(event, deltaY)) event.preventDefault();
    lastTouchY = y;
  }

  function onWheel(event: WheelEvent) {
    if (blocksPage(event, event.deltaY)) event.preventDefault();
  }

  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    document.removeEventListener("touchstart", onTouchStart);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("wheel", onWheel);
    html.style.overflow = previous.htmlOverflow;
    body.style.overflow = previous.bodyOverflow;
    body.style.position = previous.bodyPosition;
    body.style.top = previous.bodyTop;
    body.style.left = previous.bodyLeft;
    body.style.right = previous.bodyRight;
    body.style.width = previous.bodyWidth;
    window.scrollTo(0, scrollY);
  };
}

export function QuickView({
  slug,
  href,
  currency,
  minorUnit,
  onClose,
}: {
  slug: string;
  href: string;
  currency: string;
  minorUnit: number;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ignoreClose = useRef(false);
  const [product, setProduct] = useState<QuickProduct | undefined>(undefined);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-close]")?.focus();
    const release = freezePage(dialog);
    return () => {
      release();
      if (!dialog.open) return;
      ignoreClose.current = true;
      dialog.close();
    };
  }, []);

  function handleDialogClose() {
    if (ignoreClose.current) {
      ignoreClose.current = false;
      return;
    }
    onClose();
  }

  useEffect(() => {
    let cancel = false;
    loadQuickView(slug)
      .then((result) => {
        if (!cancel) setProduct(result);
      })
      .catch(() => {
        if (!cancel) setProduct(null);
      });
    return () => {
      cancel = true;
    };
  }, [slug]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="card quick-view"
      aria-labelledby={product ? titleId : undefined}
      aria-label={product ? undefined : "معاينة المنتج"}
      onClose={handleDialogClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="quick-view-panel">
        <button className="quick-view-close" type="button" data-close onClick={onClose}>
          إغلاق
        </button>
        {product === undefined ? <p>لحظة</p> : null}
        {product === null ? <p>تعذر فتح المنتج</p> : null}
        {product ? (
          <>
            <ProductPurchase
              name={product.name}
              description={product.description}
              eyebrow={product.eyebrow}
              variants={product.variants}
              images={product.images}
              currency={currency}
              minorUnit={minorUnit}
              titleTag="h2"
              titleId={titleId}
              surface="dialog"
            />
            <Link className="quiet-link" href={href}>
              صفحة المنتج
            </Link>
          </>
        ) : null}
      </div>
    </dialog>,
    document.body,
  );
}
