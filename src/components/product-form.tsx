import { BoundForm } from "@/components/bound-form";
import { ChoiceList } from "@/components/controls/choice-list";
import { Check } from "@/components/controls/check";
import { Stepper } from "@/components/controls/stepper";
import { VariantEditor, type VariantDraft } from "@/components/variant-editor";
import { saveProduct } from "@/server/actions/catalog";
import { minorToInput } from "@/lib/money";

type Category = { id: string; name: string };
type Brand = { id: string; name: string };
type ProductValues = {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
};

export function ProductForm({
  product,
  categories,
  brands,
  variants,
  minorUnit,
}: {
  product?: ProductValues;
  categories: Category[];
  brands: Brand[];
  variants: VariantDraft[];
  minorUnit: number;
}) {
  return (
    <BoundForm action={saveProduct} submit="حفظ المنتج" cancelHref="/admin/products">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <div className="admin-editor">
        <div className="grid gap-3">
          <h2 className="m-0 text-lg font-medium">المعلومات</h2>
          <label className="grid gap-1">
            الاسم
            <input className="field" name="name" defaultValue={product?.name ?? ""} required />
          </label>
          <label className="grid gap-1">
            الوصف
            <textarea className="field" name="description" rows={4} defaultValue={product?.description ?? ""} />
          </label>
          <h2 className="m-0 text-lg font-medium">الخيارات</h2>
          <VariantEditor initial={variants.length ? variants : []} />
          <p className="text-xs text-muted">الأسعار بوحدة العرض، وتُحفظ كوحدات صغرى ({minorUnit}). تغيير المخزون يُحسب فرقًا عن الكمية المحمّلة حتى لا يُمسح بيع حدث أثناء التعديل.</p>
        </div>
        <aside className="admin-surface grid gap-3 p-4">
          <h2 className="m-0 text-lg font-medium">النشر</h2>
          <label className="grid gap-1">
            التصنيف
            <ChoiceList name="categoryId" defaultValue={product?.categoryId ?? ""} placeholder="بدون" options={[{ value: "", label: "بدون" }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
          </label>
          <label className="grid gap-1">
            العلامة
            <ChoiceList name="brandId" defaultValue={product?.brandId ?? ""} placeholder="بدون" options={[{ value: "", label: "بدون" }, ...brands.map((item) => ({ value: item.id, label: item.name }))]} />
          </label>
          <label className="grid gap-1">
            ترتيب العرض
            <Stepper name="sortOrder" defaultValue={product?.sortOrder ?? 0} label="ترتيب العرض" />
          </label>
          <Check name="isFeatured" defaultChecked={product?.isFeatured ?? false}>منتج مميز</Check>
          <Check name="isPublished" defaultChecked={product?.isPublished ?? false}>منشور في المتجر</Check>
        </aside>
      </div>
    </BoundForm>
  );
}

export function draftsFromVariants(
  variants: Array<{
    id: string;
    sku: string;
    shadeName: string | null;
    sizeName: string | null;
    priceMinor: number;
    compareAtPriceMinor: number | null;
    stockQty: number;
    isActive: boolean;
  }>,
  minorUnit: number,
): VariantDraft[] {
  return variants.map((variant) => ({
    key: variant.id,
    id: variant.id,
    sku: variant.sku,
    shadeName: variant.shadeName ?? "",
    sizeName: variant.sizeName ?? "",
    price: minorToInput(variant.priceMinor, minorUnit),
    compare: variant.compareAtPriceMinor ? minorToInput(variant.compareAtPriceMinor, minorUnit) : "",
    stock: String(variant.stockQty),
    loadedStock: String(variant.stockQty),
    active: variant.isActive ? "1" : "0",
  }));
}
