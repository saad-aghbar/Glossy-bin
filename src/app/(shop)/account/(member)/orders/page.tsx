import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { orderStatusLabel, paymentStatusLabel, type OrderStatus, type PaymentStatus } from "@/lib/labels";
import { formatMinor } from "@/lib/money";
import { pageCount, parsePagination } from "@/lib/pagination";
import { requireUser } from "@/lib/session";
import { getSettings, listOwnOrders } from "@/server/queries";

export const metadata = { title: "طلباتي" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const pagination = parsePagination(params, 20);
  const [settings, result] = await Promise.all([
    getSettings(),
    listOwnOrders(user.id, pagination.offset, pagination.pageSize),
  ]);
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">طلباتي</h1>
      {result.rows.length === 0 ? <p>لا توجد طلبات بعد.</p> : null}
      {result.rows.map((order) => (
        <Link key={order.id} href={`/account/orders/${order.number}`} className="card flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
          <span className="min-w-0">
            <strong>{order.number}</strong>
            <span className="mt-1 block text-sm text-muted">
              التوصيل: {orderStatusLabel[order.status as OrderStatus] ?? order.status}
              {" · "}
              الدفع: {paymentStatusLabel[order.paymentStatus as PaymentStatus] ?? order.paymentStatus}
            </span>
          </span>
          <span className="shrink-0">{formatMinor(order.totalMinor, settings?.currency ?? order.currency, settings?.minorUnit ?? 100)}</span>
        </Link>
      ))}
      <Pagination page={pagination.page} pages={pageCount(result.total, pagination.pageSize)} path="/account/orders" params={{}} />
    </div>
  );
}
