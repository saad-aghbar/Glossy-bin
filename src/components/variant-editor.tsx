"use client";

import { useState } from "react";
import { Check } from "@/components/controls/check";
import { Stepper } from "@/components/controls/stepper";

export type VariantDraft = {
  key: string;
  id: string;
  sku: string;
  shadeName: string;
  sizeName: string;
  price: string;
  compare: string;
  stock: string;
  loadedStock: string;
  active: string;
};

function blank(): VariantDraft {
  return {
    key: crypto.randomUUID(),
    id: "",
    sku: "",
    shadeName: "",
    sizeName: "",
    price: "",
    compare: "",
    stock: "0",
    loadedStock: "",
    active: "1",
  };
}

export function VariantEditor({ initial }: { initial: VariantDraft[] }) {
  const [rows, setRows] = useState(initial.length ? initial : [blank()]);
  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <fieldset key={row.key} className="variant-card">
          <legend className="px-1 font-bold">خيار {index + 1}</legend>
          <input type="hidden" name="variantId" value={row.id} />
          <input type="hidden" name="variantActive" value={row.active} />
          <input type="hidden" name="variantStockLoaded" value={row.loadedStock} />
          <label className="grid gap-1 text-sm">
            SKU
            <input className="field" name="variantSku" value={row.sku} required onChange={(event) => update(row.key, { sku: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            الدرجة
            <input className="field" name="variantShade" value={row.shadeName} onChange={(event) => update(row.key, { shadeName: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            المقاس
            <input className="field" name="variantSize" value={row.sizeName} onChange={(event) => update(row.key, { sizeName: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            السعر
            <input className="field" name="variantPrice" inputMode="decimal" value={row.price} required onChange={(event) => update(row.key, { price: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            السعر قبل الخصم
            <input className="field" name="variantCompare" inputMode="decimal" value={row.compare} onChange={(event) => update(row.key, { compare: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            المخزون
            <Stepper name="variantStock" value={row.stock} onValue={(stock) => update(row.key, { stock })} min={0} label="المخزون" />
          </label>
          <Check checked={row.active === "1"} onChecked={(value) => update(row.key, { active: value ? "1" : "0" })}>
            متاح للبيع
          </Check>
          {rows.length > 1 ? (
            <button type="button" className="btn btn-ghost" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}>
              حذف الخيار
            </button>
          ) : null}
        </fieldset>
      ))}
      <button type="button" className="btn btn-ghost" onClick={() => setRows((current) => [...current, blank()])}>
        إضافة خيار
      </button>
    </div>
  );

  function update(key: string, patch: Partial<VariantDraft>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }
}
