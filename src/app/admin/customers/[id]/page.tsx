import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/page";
import { banCustomerAction } from "@/server/actions/admin";
import { formatMinor } from "@/lib/money";
import { getCustomer, getSettings } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [customer, settings] = await Promise.all([getCustomer(id), getSettings()]);
  if (!customer || !settings) notFound();
  return (
    <AdminPage title={customer.user.name} description="بيانات الحساب والطلبات المرتبطة به. لا تُعرض بيانات الدخول." width="narrow">
      <p>
        {customer.user.email} · {customer.user.phone || "بدون هاتف"}
      </p>
      <form action={banCustomerAction} className="card grid gap-3 p-4">
        <input type="hidden" name="id" value={customer.user.id} />
        <input type="hidden" name="banned" value={customer.user.banned ? "0" : "1"} />
        <input className="field" name="banReason" defaultValue={customer.user.banReason ?? ""} placeholder="سبب الإيقاف" />
        <button className="btn btn-ghost w-fit" type="submit">
          {customer.user.banned ? "إلغاء الإيقاف" : "إيقاف الحساب"}
        </button>
      </form>
      <h2 className="text-xl font-bold">الطلبات</h2>
      {customer.orders.map((order) => (
        <Link key={order.id} href={`/admin/orders/${order.id}`} className="card flex justify-between p-3">
          <span>{order.number}</span>
          <span>{formatMinor(order.totalMinor, settings.currency, settings.minorUnit)}</span>
        </Link>
      ))}
    </AdminPage>
  );
}
