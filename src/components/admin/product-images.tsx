"use client";

import { useState } from "react";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton, PlateImage } from "@/components/ui";
import {
  chooseMainImageAction,
  deleteImageAction,
  moveImageAction,
  reorderImagesAction,
} from "@/server/actions/catalog";

type ImageItem = { id: string; url: string; alt: string | null; variantLabel: string };

export function ProductImages({
  productId,
  productName,
  images,
}: {
  productId: string;
  productName: string;
  images: ImageItem[];
}) {
  const [order, setOrder] = useState(images);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function dropAt(target: number) {
    if (dragIndex == null || dragIndex === target) {
      setDragIndex(null);
      return;
    }
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    setOrder(next);
    setDragIndex(null);
    const data = new FormData();
    data.set("productId", productId);
    for (const image of next) data.append("imageId", image.id);
    void reorderImagesAction(data);
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {order.map((image, index) => (
        <figure
          key={image.id}
          className={index === 0 ? "image-card card is-main grid gap-2 overflow-hidden p-2" : "image-card card grid gap-2 overflow-hidden p-2"}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => dropAt(index)}
          onDragEnd={() => setDragIndex(null)}
        >
          <PlateImage src={image.url} alt={image.alt || productName} className="aspect-square w-full object-cover" />
          <p className="text-sm">{image.variantLabel}</p>
          <p className="text-sm">{index === 0 ? "الصورة الرئيسية" : image.alt || "صورة إضافية"}</p>
          <div className="flex flex-wrap gap-2">
            {index === 0 ? null : (
              <form action={chooseMainImageAction}>
                <input type="hidden" name="id" value={image.id} />
                <button className="btn btn-ghost" type="submit">
                  صورة رئيسية
                </button>
              </form>
            )}
            {index === 0 ? null : (
              <form action={moveImageAction}>
                <input type="hidden" name="id" value={image.id} />
                <input type="hidden" name="direction" value="earlier" />
                <button className="btn btn-ghost" type="submit">
                  تقديم
                </button>
              </form>
            )}
            {index === order.length - 1 ? null : (
              <form action={moveImageAction}>
                <input type="hidden" name="id" value={image.id} />
                <input type="hidden" name="direction" value="later" />
                <button className="btn btn-ghost" type="submit">
                  تأخير
                </button>
              </form>
            )}
          </div>
          <ConfirmForm action={deleteImageAction} message="حذف هذه الصورة؟">
            <input type="hidden" name="id" value={image.id} />
            <input type="hidden" name="confirmDelete" value="yes" />
            <PendingButton>حذف</PendingButton>
          </ConfirmForm>
        </figure>
      ))}
    </div>
  );
}
