import Link from "next/link";
import { AdminPage } from "@/components/admin/page";
import { DayFields } from "@/components/date-fields";
import { PlateImage } from "@/components/ui";
import { resolveDay } from "@/lib/dates";
import { orderStatusLabel, paymentStatusLabel, type OrderStatus, type PaymentStatus } from "@/lib/labels";
import { formatMinor } from "@/lib/money";
import { one } from "@/lib/pagination";
import { getSettings, lowStockProducts, parseOrderDay, salesSummary } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "لوحة المبيعات" };

function rangeHeading(fromText: string, toText: string) {
  if (!fromText && !toText) return "كل الفترات، حسب تاريخ إنشاء الطلب بتوقيت القدس";
  if (fromText && toText) return `من ${fromText} إلى ${toText}، حسب تاريخ إنشاء الطلب بتوقيت القدس`;
  if (fromText) return `من ${fromText}، حسب تاريخ إنشاء الطلب بتوقيت القدس`;
  return `حتى ${toText}، حسب تاريخ إنشاء الطلب بتوقيت القدس`;
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const fromText = resolveDay(one(params.from), one(params.fromYear), one(params.fromMonth), one(params.fromDay));
  const toText = resolveDay(one(params.to), one(params.toYear), one(params.toMonth), one(params.toDay));
  const invalidDay = fromText === "invalid" || toText === "invalid";
  const from = parseOrderDay(fromText, false);
  const to = parseOrderDay(toText, true);
  const inverted = Boolean(from && to && from > to);
  const [settings, summary, lowStock] = await Promise.all([
    getSettings(),
    inverted ? Promise.resolve(null) : salesSummary({ from, to }),
    lowStockProducts(),
  ]);
  const currency = settings?.currency ?? "SAR";
  const minorUnit = settings?.minorUnit ?? 100;
  const maxRevenue = Math.max(1, ...(summary?.revenueDays.map((row) => row.revenueMinor) ?? [1]));
  const attention = [
    summary && (summary.totals?.unpaidOrders ?? 0) > 0
      ? { href: "/admin/orders?paymentStatus=unpaid", label: `${summary.totals?.unpaidOrders} طلبات غير مدفوعة` }
      : null,
    summary && (summary.totals?.cancelledOrders ?? 0) > 0
      ? { href: "/admin/orders?status=cancelled", label: `${summary.totals?.cancelledOrders} طلبات ملغاة في هذه الفترة` }
      : null,
    lowStock.length > 0 ? { href: "/admin/products?stock=out", label: `${lowStock.length} خيارات بمخزون منخفض أو نافد` } : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  return (
    <AdminPage title="لوحة المبيعات" description="أرقام من الطلبات المحفوظة فقط. طلبات الدفع عند الاستلام والتحويل لا تُحسب إيرادًا مدفوعًا إلا بعد تسجيل الاستلام.">
      <form className="dash-period" method="get">
        <DayFields name="from" label="من" value={fromText === "invalid" ? "" : fromText} />
        <DayFields name="to" label="إلى" value={toText === "invalid" ? "" : toText} />
        <button className="btn btn-primary" type="submit">عرض الفترة</button>
      </form>
      <p className="admin-note">{rangeHeading(fromText === "invalid" ? "" : fromText, toText === "invalid" ? "" : toText)}</p>
      {invalidDay ? <p className="alert">التاريخ غير صالح.</p> : null}
      {inverted ? <p className="alert">تاريخ البداية بعد تاريخ النهاية.</p> : null}
      {summary ? (
        <>
          <section className="dash-revenue">
            <div>
              <h2 className="m-0 text-lg font-medium">الإيراد المدفوع</h2>
              <p className="m-0">{formatMinor(summary.totals?.revenueMinor ?? 0, currency, minorUnit)}</p>
            </div>
            {summary.revenueDays.length === 0 ? <p className="admin-note">لا توجد مبالغ مدفوعة في هذه الفترة.</p> : null}
            <div className="dash-columns" aria-hidden="true">
              {summary.revenueDays.map((row) => (
                <div key={row.day} className="dash-column">
                  <b style={{ ["--p" as string]: Math.max(0.08, row.revenueMinor / maxRevenue) }} />
                  <span>{row.day.slice(5)}</span>
                </div>
              ))}
            </div>
            {summary.revenueDays.length > 0 ? (
              <table className="sr-only">
                <caption>الإيراد المدفوع حسب يوم إنشاء الطلب بتوقيت القدس</caption>
                <tbody>
                  {summary.revenueDays.map((row) => (
                    <tr key={row.day}>
                      <td>{row.day}</td>
                      <td>{formatMinor(row.revenueMinor, currency, minorUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </section>
          <section className="dash-attention">
            <h2 className="m-0 px-2 pt-2 text-lg font-medium">تحتاج انتباهك</h2>
            {attention.length === 0 ? <p className="admin-note px-2 pb-2">لا يوجد ما يحتاج متابعة في هذه الفترة.</p> : null}
            {attention.map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
          </section>
          <section className="dash-ledger">
            <div className="grid gap-2 p-4">
              <h2 className="m-0 text-lg font-medium">أحدث الطلبات</h2>
              <p className="dash-facts">
                <Link href="/admin/orders">{summary.totals?.openOrders ?? 0} مفتوحة</Link>
                <Link href="/admin/orders?paymentStatus=unpaid" data-kind="unpaid">{summary.totals?.unpaidOrders ?? 0} غير مدفوعة</Link>
                <Link href="/admin/orders?status=cancelled" data-kind="cancelled">{summary.totals?.cancelledOrders ?? 0} ملغاة</Link>
              </p>
            </div>
            {summary.recent.length === 0 ? <p className="admin-note px-4 pb-4">لا توجد طلبات مطابقة.</p> : null}
            {summary.recent.map((order) => (
              <article key={order.id} className="dash-order">
                <Link href={`/admin/orders/${order.id}`}><strong>{order.number}</strong></Link>
                <span>{order.recipientName}</span>
                <span className="dash-money">{formatMinor(order.totalMinor, currency, minorUnit)}</span>
                <span>{paymentStatusLabel[order.paymentStatus as PaymentStatus] ?? order.paymentStatus}</span>
                <span>{orderStatusLabel[order.status as OrderStatus] ?? order.status}</span>
              </article>
            ))}
          </section>
        </>
      ) : null}
      <section className="dash-shelf">
        <h2 className="m-0 p-4 text-lg font-medium">مخزون منخفض</h2>
        {lowStock.length === 0 ? <p className="admin-note px-4 pb-4">لا توجد خيارات بمخزون ٣ أو أقل.</p> : null}
        {lowStock.map((item) => (
          <Link key={`${item.productId}-${item.sku}`} href={`/admin/products/${item.productId}`} className="dash-sku">
            <PlateImage src={item.imageUrl} alt="" className="plate h-12 w-12 object-cover" />
            <span>
              <strong className="block font-medium">{item.name}</strong>
              <span className="admin-note">{item.sku}</span>
            </span>
            <b data-empty={item.stockQty === 0}>{item.stockQty}</b>
          </Link>
        ))}
      </section>
    </AdminPage>
  );
}
