import Link from "next/link";
import { randomUUID } from "node:crypto";
import { CheckoutForm } from "@/components/checkout-form";
import { ChoiceList } from "@/components/controls/choice-list";
import { formatMinor } from "@/lib/money";
import { paymentMethodLabel } from "@/lib/labels";
import { one } from "@/lib/pagination";
import { getCurrentUser } from "@/lib/session";
import { getSettings, listOwnAddresses, quoteCheckout } from "@/server/queries";

export const metadata = { title: "الدفع" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const quote = await quoteCheckout(one(params.zone), one(params.code));
  const addresses = user ? await listOwnAddresses(user.id) : [];
  const settings = quote.settings ?? (await getSettings());
  if (!quote.cart?.items.length) {
    return (
      <p className="card shop-empty">
        السلة فارغة. <Link href="/products">العودة للتسوق</Link>
      </p>
    );
  }
  const currency = settings?.currency ?? "SAR";
  const minorUnit = settings?.minorUnit ?? 100;
  const checkoutKey = randomUUID();
  const methods = [
    settings?.codEnabled ? paymentMethodLabel.cod : null,
    settings?.bankTransferEnabled ? paymentMethodLabel.bank_transfer : null,
  ].filter(Boolean);
  return (
    <div className="shop-split py-8">
      <div className="grid gap-4">
        <h1 className="m-0 text-4xl font-normal">الدفع</h1>
        {quote.blocked ? (
          <p className="alert">
            بعض القطع في الحقيبة لم تعد متاحة أو كميتها أكبر من المتوفر.{" "}
            <Link href="/cart">العودة إلى الحقيبة لحذفها</Link>
          </p>
        ) : null}
        {user ? (
          <p>
            مرحباً {user.name}. هذا الطلب يُربط بحسابك
            {addresses.length > 0 ? "، ويمكنك اختيار عنوان محفوظ." : "."}
          </p>
        ) : (
          <p>
            طلب كضيفة، دون إنشاء حساب. أو <Link href="/account/register">إنشاء حساب</Link> لمتابعة الطلبات لاحقاً.
          </p>
        )}
        <form className="card grid gap-3 p-4 md:grid-cols-2" method="get">
          <label className="grid gap-1">
            منطقة التوصيل
            <ChoiceList
              name="zone"
              defaultValue={quote.zone?.id ?? ""}
              placeholder="اختاري المنطقة"
              options={quote.zones.map((zone) => ({ value: zone.id, label: `${zone.name} — ${formatMinor(zone.feeMinor, currency, minorUnit)}` }))}
            />
          </label>
          <label className="grid gap-1">
            رمز الخصم
            <input className="field" name="code" defaultValue={quote.code} />
          </label>
          <button className="btn btn-ghost md:col-span-2 md:w-fit" type="submit">
            تحديث المبلغ
          </button>
          {quote.discountError ? <p className="alert md:col-span-2">{quote.discountError}</p> : null}
        </form>
        <CheckoutForm
          user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
          addresses={addresses.map((item) => ({
            id: item.id,
            recipientName: item.recipientName,
            phone: item.phone,
            city: item.city,
            area: item.area,
            street: item.street,
            isDefault: item.isDefault,
          }))}
          codEnabled={Boolean(settings?.codEnabled)}
          bankTransferEnabled={Boolean(settings?.bankTransferEnabled)}
          bankInstructions={settings?.bankInstructions ?? null}
          zoneId={quote.zone?.id ?? ""}
          discountCode={quote.discountError ? "" : quote.code}
          checkoutKey={checkoutKey}
          blocked={quote.blocked}
        />
      </div>
      <aside className="h-fit">
        <details className="order-summary card grid gap-3 p-4" open>
        <summary className="text-xl">ملخص الطلب</summary>
        {quote.lines.map((line) => (
          <div key={line.variantId} className="grid gap-1 text-sm">
            <p className="flex min-w-0 justify-between gap-3">
              <span className="min-w-0 break-words">
                {line.name} — {line.label} × {line.qty}
              </span>
              <span className="shrink-0">{line.blocked ? "غير مشمول" : formatMinor(line.lineTotalMinor, currency, minorUnit)}</span>
            </p>
            {line.messages.map((message) => (
              <p key={message} className="alert">
                {message}
              </p>
            ))}
          </div>
        ))}
        {quote.totals ? (
          <dl className="grid gap-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between">
              <dt>المجموع</dt>
              <dd>{formatMinor(quote.totals.subtotalMinor, currency, minorUnit)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>الخصم</dt>
              <dd>{formatMinor(quote.totals.discountMinor, currency, minorUnit)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>التوصيل{quote.zone ? ` · ${quote.zone.name}` : ""}</dt>
              <dd className="shrink-0">{formatMinor(quote.totals.deliveryFeeMinor, currency, minorUnit)}</dd>
            </div>
            <div className="flex justify-between text-lg font-extrabold">
              <dt>الإجمالي</dt>
              <dd>{formatMinor(quote.totals.totalMinor, currency, minorUnit)}</dd>
            </div>
          </dl>
        ) : (
          <p>اختاري منطقة توصيل، أو أزيلي القطع غير المتاحة.</p>
        )}
        {methods.length ? <p className="text-sm">طرق الدفع: {methods.join("، ")}</p> : null}
        <Link className="quiet-link" href="/pages/delivery">
          تفاصيل التوصيل
        </Link>
        </details>
      </aside>
    </div>
  );
}
