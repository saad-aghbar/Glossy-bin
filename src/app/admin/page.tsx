import Link from "next/link";
import { DayFields } from "@/components/date-fields";
import { resolveDay } from "@/lib/dates";
import { orderStatusLabel, paymentStatusLabel, type OrderStatus, type PaymentStatus } from "@/lib/labels";
import { formatMinor } from "@/lib/money";
import { one } from "@/lib/pagination";
import { getSettings, parseOrderDay, salesSummary } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "لوحة المبيعات" };

function rangeHeading(fromText: string, toText: string) {
  if (!fromText && !toText) return "كل الفترات";
  if (fromText && toText) return `من ${fromText} إلى ${toText}`;
  if (fromText) return `من ${fromText}`;
  return `حتى ${toText}`;
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
  const [settings, summary] = await Promise.all([
    getSettings(),
    inverted ? Promise.resolve(null) : salesSummary({ from, to }),
  ]);
  const currency = settings?.currency ?? "SAR";
  const minorUnit = settings?.minorUnit ?? 100;
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-extrabold">ملخص المبيعات</h1>
      <p className="text-sm text-muted">
        هذه الأرقام من الطلبات المحفوظة، وليست زيارات أو مشاهدات منتجات. طلبات الدفع عند الاستلام والتحويل البنكي لا تُحسب مبيعات مدفوعة إلا بعد تسجيل الاستلام.
      </p>
      <p className="text-muted">{rangeHeading(fromText === "invalid" ? "" : fromText, toText === "invalid" ? "" : toText)}</p>
      <form className="grid gap-3" method="get">
        <DayFields name="from" label="من تاريخ" value={fromText === "invalid" ? "" : fromText} />
        <DayFields name="to" label="إلى تاريخ" value={toText === "invalid" ? "" : toText} />
        <div className="filter-actions">
          <button className="btn btn-primary" type="submit">
            عرض
          </button>
        </div>
      </form>
      {invalidDay ? <p className="alert">التاريخ غير صالح.</p> : null}
      {inverted ? <p className="alert">تاريخ البداية بعد تاريخ النهاية.</p> : null}
      {summary ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <article className="card p-4">
              <p className="text-sm text-muted">كل الطلبات</p>
              <p className="text-3xl font-extrabold">{summary.totals?.orders ?? 0}</p>
            </article>
            <article className="card p-4">
              <p className="text-sm text-muted">غير الملغاة</p>
              <p className="text-3xl font-extrabold">{summary.totals?.openOrders ?? 0}</p>
            </article>
            <article className="card p-4">
              <p className="text-sm text-muted">الملغاة</p>
              <p className="text-3xl font-extrabold">{summary.totals?.cancelledOrders ?? 0}</p>
            </article>
            <article className="card p-4">
              <p className="text-sm text-muted">غير المدفوعة</p>
              <p className="text-3xl font-extrabold">{summary.totals?.unpaidOrders ?? 0}</p>
              <p className="mt-2 text-sm text-muted">غير مدفوع أو بانتظار التحويل، دون الملغاة.</p>
            </article>
            <article className="card p-4">
              <p className="text-sm text-muted">إيراد الطلبات المدفوعة</p>
              <p className="text-3xl font-extrabold">{formatMinor(summary.totals?.revenueMinor ?? 0, currency, minorUnit)}</p>
              <p className="mt-2 text-sm text-muted">لا يشمل الطلبات غير المدفوعة أو الملغاة.</p>
            </article>
          </div>
          <section className="grid gap-2">
            <h2 className="text-xl font-bold">حسب حالة التوصيل</h2>
            <ul className="flex flex-wrap gap-2">
              {summary.byStatus.map((row) => (
                <li key={row.status} className="card px-3 py-2">
                  {orderStatusLabel[row.status as OrderStatus] ?? row.status}: {row.count}
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-2">
            <h2 className="text-xl font-bold">أحدث الطلبات</h2>
            {summary.recent.length === 0 ? <p>لا توجد طلبات مطابقة.</p> : null}
            <div className="list-cards grid gap-2">
              {summary.recent.map((order) => (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="card grid gap-1 p-3">
                  <span className="font-bold">{order.number}</span>
                  <span>التوصيل: {orderStatusLabel[order.status as OrderStatus] ?? order.status}</span>
                  <span>الدفع: {paymentStatusLabel[order.paymentStatus as PaymentStatus] ?? order.paymentStatus}</span>
                  <span>{formatMinor(order.totalMinor, currency, minorUnit)}</span>
                </Link>
              ))}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>التوصيل</th>
                  <th>الدفع</th>
                  <th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link className="font-bold" href={`/admin/orders/${order.id}`}>
                        {order.number}
                      </Link>
                    </td>
                    <td>{orderStatusLabel[order.status as OrderStatus] ?? order.status}</td>
                    <td>{paymentStatusLabel[order.paymentStatus as PaymentStatus] ?? order.paymentStatus}</td>
                    <td>{formatMinor(order.totalMinor, currency, minorUnit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
