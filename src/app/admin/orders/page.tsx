import Link from "next/link";
import { DayFields } from "@/components/date-fields";
import { Pagination } from "@/components/pagination";
import {
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/labels";
import { resolveDay } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { one, pageCount, parsePagination } from "@/lib/pagination";
import { requireAdminPage } from "@/lib/session";
import { getSettings, listAdminOrders, parseOrderDay } from "@/server/queries";

export const metadata = { title: "الطلبات" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const pagination = parsePagination(params, 20);
  const q = one(params.q);
  const status = one(params.status);
  const paymentStatus = one(params.paymentStatus);
  const paymentMethod = one(params.paymentMethod);
  const fromText = resolveDay(one(params.from), one(params.fromYear), one(params.fromMonth), one(params.fromDay));
  const toText = resolveDay(one(params.to), one(params.toYear), one(params.toMonth), one(params.toDay));
  const invalidDay = fromText === "invalid" || toText === "invalid";
  const from = parseOrderDay(fromText, false);
  const to = parseOrderDay(toText, true);
  const inverted = Boolean(from && to && from > to);
  const [settings, result] = await Promise.all([
    getSettings(),
    inverted
      ? Promise.resolve({ rows: [], total: 0 })
      : listAdminOrders(
          { q, status, paymentStatus, paymentMethod, from, to },
          pagination.offset,
          pagination.pageSize,
        ),
  ]);
  const preserved = Object.fromEntries(
    Object.entries({
      q,
      status,
      paymentStatus,
      paymentMethod,
      from: fromText === "invalid" ? "" : fromText,
      to: toText === "invalid" ? "" : toText,
    }).filter(([, value]) => value),
  );
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-extrabold">الطلبات</h1>
      <form className="grid gap-3 md:grid-cols-2" method="get">
        <label className="grid gap-1">
          بحث برقم الطلب أو الاسم أو البريد
          <input className="field" name="q" defaultValue={q} />
        </label>
        <label className="grid gap-1">
          حالة التوصيل
          <select className="select" name="status" defaultValue={status}>
            <option value="">كل الحالات</option>
            {Object.entries(orderStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          حالة الدفع
          <select className="select" name="paymentStatus" defaultValue={paymentStatus}>
            <option value="">كل حالات الدفع</option>
            {Object.entries(paymentStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          طريقة الدفع
          <select className="select" name="paymentMethod" defaultValue={paymentMethod}>
            <option value="">كل الطرق</option>
            {Object.entries(paymentMethodLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <DayFields name="from" label="من تاريخ" value={fromText === "invalid" ? "" : fromText} />
        <DayFields name="to" label="إلى تاريخ" value={toText === "invalid" ? "" : toText} />
        <div className="filter-actions">
          <button className="btn btn-primary" type="submit">
            تصفية
          </button>
        </div>
      </form>
      {invalidDay ? <p className="alert">التاريخ غير صالح.</p> : null}
      {inverted ? <p className="alert">تاريخ البداية بعد تاريخ النهاية.</p> : null}
      {result.rows.length === 0 ? <p>لا توجد طلبات مطابقة.</p> : null}
      <div className="list-cards grid gap-2">
        {result.rows.map((order) => (
          <Link key={order.id} href={`/admin/orders/${order.id}`} className="card grid gap-1 p-3">
            <span className="font-bold">{order.number}</span>
            <span>التوصيل: {orderStatusLabel[order.status as OrderStatus] ?? order.status}</span>
            <span>الدفع: {paymentStatusLabel[order.paymentStatus as PaymentStatus] ?? order.paymentStatus}</span>
            <span>{formatMinor(order.totalMinor, settings?.currency ?? order.currency, settings?.minorUnit ?? 100)}</span>
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
          {result.rows.map((order) => (
            <tr key={order.id}>
              <td>
                <Link className="font-bold" href={`/admin/orders/${order.id}`}>
                  {order.number}
                </Link>
              </td>
              <td>{orderStatusLabel[order.status as OrderStatus] ?? order.status}</td>
              <td>{paymentStatusLabel[order.paymentStatus as PaymentStatus] ?? order.paymentStatus}</td>
              <td>{formatMinor(order.totalMinor, settings?.currency ?? order.currency, settings?.minorUnit ?? 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        page={pagination.page}
        pages={pageCount(result.total, pagination.pageSize)}
        path="/admin/orders"
        params={preserved}
      />
    </div>
  );
}
