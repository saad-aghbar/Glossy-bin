import Link from "next/link";
import { AdminPage } from "@/components/admin/page";
import { ChoiceList } from "@/components/controls/choice-list";
import { DayFields } from "@/components/date-fields";
import { Pagination } from "@/components/pagination";
import {
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  type OrderStatus,
  type PaymentMethod,
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
    <AdminPage title="الطلبات" description="متابعة التوصيل والدفع بشكل منفصل. المبالغ تُعرض بعملة الطلب المحفوظة.">
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/orders">الكل</Link>
        {Object.entries(orderStatusLabel).map(([value, label]) => (
          <Link key={value} href={`/admin/orders?status=${value}`}>{label}</Link>
        ))}
      </div>
      <form className="admin-surface grid gap-3 p-4 md:grid-cols-2" method="get">
        <label className="grid gap-1">
          بحث برقم الطلب أو الاسم أو البريد
          <input className="field" name="q" defaultValue={q} />
        </label>
        <label className="grid gap-1">
          حالة التوصيل
          <ChoiceList name="status" defaultValue={status} placeholder="كل الحالات" options={[{ value: "", label: "كل الحالات" }, ...Object.entries(orderStatusLabel).map(([value, label]) => ({ value, label }))]} />
        </label>
        <label className="grid gap-1">
          حالة الدفع
          <ChoiceList name="paymentStatus" defaultValue={paymentStatus} placeholder="كل حالات الدفع" options={[{ value: "", label: "كل حالات الدفع" }, ...Object.entries(paymentStatusLabel).map(([value, label]) => ({ value, label }))]} />
        </label>
        <label className="grid gap-1">
          طريقة الدفع
          <ChoiceList name="paymentMethod" defaultValue={paymentMethod} placeholder="كل الطرق" options={[{ value: "", label: "كل الطرق" }, ...Object.entries(paymentMethodLabel).map(([value, label]) => ({ value, label }))]} />
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
      {result.rows.length === 0 ? <p className="admin-surface p-4">لا توجد طلبات مطابقة.</p> : null}
      <div className="grid gap-2 md:hidden">
        {result.rows.map((order) => (
          <article key={order.id} className="admin-surface grid gap-1 p-3">
            <Link className="font-medium" href={`/admin/orders/${order.id}`}>{order.number}</Link>
            <p>{order.recipientName}</p>
            <p className="admin-note">{order.createdAt.toLocaleDateString("ar")} · {formatMinor(order.totalMinor, order.currency, settings?.minorUnit ?? 100)}</p>
            <p className="admin-note">{paymentStatusLabel[order.paymentStatus as PaymentStatus] ?? order.paymentStatus} · {orderStatusLabel[order.status as OrderStatus] ?? order.status}</p>
          </article>
        ))}
      </div>
      <div className="admin-surface hidden overflow-auto md:block">
      <table className="data-table" style={{ display: "table" }}>
        <thead>
          <tr>
            <th>الطلب</th>
            <th>الزبون</th>
            <th>التاريخ</th>
            <th>المبلغ</th>
            <th>طريقة الدفع</th>
            <th>حالة الدفع</th>
            <th>التوصيل</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((order) => (
            <tr key={order.id}>
              <td><Link href={`/admin/orders/${order.id}`}>{order.number}</Link></td>
              <td>{order.recipientName}</td>
              <td>{order.createdAt.toLocaleDateString("ar")}</td>
              <td>{formatMinor(order.totalMinor, order.currency, settings?.minorUnit ?? 100)}</td>
              <td>{paymentMethodLabel[order.paymentMethod as PaymentMethod] ?? order.paymentMethod}</td>
              <td>{paymentStatusLabel[order.paymentStatus as PaymentStatus] ?? order.paymentStatus}</td>
              <td>{orderStatusLabel[order.status as OrderStatus] ?? order.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <Pagination
        page={pagination.page}
        pages={pageCount(result.total, pagination.pageSize)}
        path="/admin/orders"
        params={preserved}
      />
    </AdminPage>
  );
}
