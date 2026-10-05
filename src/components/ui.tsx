"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

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
}: {
  src: string | null;
  alt: string;
  className?: string;
  photo?: boolean;
  bare?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    if (bare) return null;
    return <RosePlate name={alt || "منتج"} className={className.replace(" object-cover", "")} />;
  }
  return (
    // Uploaded files are not known at build time.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={photo ? src : undefined}
      src={src}
      alt={alt}
      className={photo ? `${className} plate-photo` : className}
      onError={() => setFailed(true)}
    />
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
