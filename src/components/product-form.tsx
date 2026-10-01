import { BoundForm } from "@/components/bound-form";
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
      <label className="grid gap-1">
        الاسم
        <input className="field" name="name" defaultValue={product?.name ?? ""} required />
      </label>
      <label className="grid gap-1">
        الوصف
        <textarea className="field" name="description" rows={4} defaultValue={product?.description ?? ""} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          التصنيف
          <select className="select" name="categoryId" defaultValue={product?.categoryId ?? ""}>
            <option value="">بدون</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          العلامة
          <select className="select" name="brandId" defaultValue={product?.brandId ?? ""}>
            <option value="">بدون</option>
            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1">
        ترتيب العرض
        <input className="field" name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} />
        منتج مميز
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="isPublished" defaultChecked={product?.isPublished ?? false} />
        منشور في المتجر
      </label>
      <VariantEditor initial={variants.length ? variants : []} />
      <p className="text-xs text-muted">الأسعار بوحدة العرض، وتُحفظ كوحدات صغرى ({minorUnit}).</p>
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
