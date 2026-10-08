"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProductPurchase } from "@/components/product-purchase";
import { loadQuickView } from "@/server/actions/quick-view";

type QuickProduct = Awaited<ReturnType<typeof loadQuickView>>;

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
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [product, setProduct] = useState<QuickProduct | undefined>(undefined);

  useEffect(() => {
    setHost(document.querySelector<HTMLElement>(".shop-app"));
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!host || !dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-close]")?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [host]);

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

  if (!host) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="card quick-view"
      aria-labelledby={product ? titleId : undefined}
      aria-label={product ? undefined : "معاينة المنتج"}
      onClose={onClose}
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
    host,
  );
}
