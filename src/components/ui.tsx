"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { isOptimizableImage } from "@/lib/image-src";

const plates = ["#e7a8b4", "#f0c7b0", "#d9b7c4", "#c9a892", "#f3d5dc", "#e4cfc4"];

export function plateColor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % plates.length;
  return plates[hash];
}

export function RosePlate({ name, className = "plate" }: { name: string; className?: string }) {
  return (
    <div className={`${className} grid place-items-center`} style={{ "--mark": plateColor(name) } as CSSProperties} role="img" aria-label={name}>
      <span className="plate-mark" />
    </div>
  );
}

export function PlateImage({
  src,
  alt,
  className = "plate w-full object-cover",
  photo = false,
  bare = false,
  preload = false,
  sizes = "(max-width: 900px) 72vw, 280px",
}: {
  src: string | null;
  alt: string;
  className?: string;
  photo?: boolean;
  bare?: boolean;
  preload?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    if (bare) return null;
    return <RosePlate name={alt || "منتج"} className={className.replace(" object-cover", "")} />;
  }
  const contain = /product-hero-img|product-thumb-img|object-contain/.test(className);
  const frameClass = `plate-frame${contain ? " is-contain" : ""} ${className}`;
  if (!isOptimizableImage(src)) {
    return (
      <span className={frameClass}>
        {/* Remote files outside the configured image host stay original. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading={preload ? "eager" : "lazy"}
          fetchPriority={preload ? "high" : "low"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  return (
    <span className={frameClass}>
      <Image
        key={photo ? src : undefined}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        className={photo ? "plate-photo" : undefined}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export function PageSkeleton({ label = "لحظة" }: { label?: string }) {
  return (
    <div className="grid gap-4 py-8" aria-busy="true" aria-label={label}>
      <div className="skeleton h-10 w-48" />
      <div className="skeleton h-36 w-full" />
      <div className="skeleton h-36 w-full" />
    </div>
  );
}

export function PendingButton({
  children,
  className = "btn btn-ghost",
  pendingLabel = "لحظة...",
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
