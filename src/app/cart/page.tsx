import Link from "next/link";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton } from "@/components/ui";
import { removeCartAction, updateCartAction } from "@/server/actions/cart";
import { describeCartLine } from "@/lib/cart-lines";
import { formatMinor } from "@/lib/money";
import { variantLabel } from "@/lib/labels";
import { one } from "@/lib/pagination";
import { getSettings } from "@/server/queries";
import { readCart } from "@/lib/cart";

export const metadata = { title: "السلة" };

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [cart, settings] = await Promise.all([readCart(), getSettings()]);
  const currency = settings?.currency ?? "SAR";
  const minorUnit = settings?.minorUnit ?? 100;
  const items = cart?.items ?? [];
  const rows = items.map((item) => ({
    item,
    status: describeCartLine({
      qty: item.qty,
      stockQty: item.variant.stockQty,
      unitPriceMinor: item.variant.priceMinor,
      priceSeenMinor: item.priceSeenMinor,
      sellable: Boolean(item.variant.isActive && item.variant.product.isPublished && !item.variant.product.archivedAt),
    }),
  }));
  const subtotal = rows
    .filter((row) => !row.status.blocked)
    .reduce((sum, row) => sum + row.item.variant.priceMinor * row.item.qty, 0);
  return (
    <div className="grid gap-6">
      <h1 className="m-0 text-4xl font-normal">الحقيبة</h1>
      {rows.some((row) => row.status.blocked) ? (
        <p className="alert">بعض القطع لم تعد متاحة للشراء أو كميتها أكبر من المتوفر. احذفيها قبل إتمام الطلب.</p>
      ) : null}
      {one(params.error) ? <p className="alert">{one(params.error)}</p> : null}
      {items.length === 0 ? (
        <p className="card p-6">
          السلة فارغة. <Link href="/products">تصفحي المنتجات</Link>
        </p>
      ) : (
        <div className="grid gap-4">
          {rows.map(({ item, status }) => {
            return (
            <article key={item.id} className="card grid min-w-0 gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <h2 className="break-words font-bold">{item.variant.product.name}</h2>
                <p className="text-sm text-muted">{variantLabel(item.variant.shadeName, item.variant.sizeName)}</p>
                <p>{formatMinor(item.variant.priceMinor, currency, minorUnit)}</p>
                {status.messages.map((message) => (
                  <p key={message} className="alert">
                    {message}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {status.messages.some((message) => message.startsWith("لم يعد")) ? null : (
                  <form action={updateCartAction} className="flex items-center gap-2">
                    <input type="hidden" name="itemId" value={item.id} />
                    <input className="field w-20" name="qty" type="number" min={1} max={99} defaultValue={item.qty} aria-label="الكمية" />
                    <PendingButton>تحديث</PendingButton>
                  </form>
                )}
                <ConfirmForm action={removeCartAction} message="حذف هذه القطعة من الحقيبة؟" className="flex">
                  <input type="hidden" name="itemId" value={item.id} />
                  <PendingButton>حذف</PendingButton>
                </ConfirmForm>
              </div>
            </article>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-bold">المجموع {formatMinor(subtotal, currency, minorUnit)}</p>
            <Link className="btn btn-primary" href="/checkout">
              إتمام الطلب
            </Link>
          </div>
          <p className="text-sm text-muted">رسوم التوصيل والخصم تُحسب على الخادم في صفحة الدفع.</p>
        </div>
      )}
    </div>
  );
}
