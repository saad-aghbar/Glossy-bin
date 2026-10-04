import Link from "next/link";
import { AdminPage } from "@/components/admin/page";
import { Pagination } from "@/components/pagination";
import { one, pageCount, parsePagination } from "@/lib/pagination";
import { formatMinor } from "@/lib/money";
import { getSettings, listCustomers } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "الزبائن" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const pagination = parsePagination(params, 20);
  const q = one(params.q).trim();
  const [settings, result] = await Promise.all([
    getSettings(),
    listCustomers(q, pagination.offset, pagination.pageSize),
  ]);
  const currency = settings?.currency ?? "SAR";
  const minorUnit = settings?.minorUnit ?? 100;
  return (
    <AdminPage title="الزبائن" description="حسابات الزبائن فقط. لا تُعرض كلمات المرور أو جلسات الدخول.">
      <form className="flex gap-2" method="get">
        <input className="field" name="q" defaultValue={q} placeholder="الاسم أو البريد" aria-label="بحث عن زبون" />
        <button className="btn btn-ghost" type="submit">
          بحث
        </button>
      </form>
      {result.rows.length === 0 ? <p className="admin-surface p-4">لا توجد نتائج.</p> : null}
      <div className="grid gap-2 md:hidden">
        {result.rows.map((customer) => (
          <article key={customer.id} className="admin-surface grid gap-1 p-3">
            <Link className="font-medium" href={`/admin/customers/${customer.id}`}>{customer.name}</Link>
            <p className="admin-note" dir="ltr">{customer.email}</p>
            <p className="admin-note">{customer.phone || "—"} · {customer.banned ? "موقوف" : "نشط"}</p>
            <p>{customer.orderCount} طلب · المدفوع {formatMinor(customer.paidMinor, currency, minorUnit)}</p>
          </article>
        ))}
      </div>
      <div className="admin-surface hidden overflow-auto md:block">
        <table className="data-table" style={{ display: "table" }}>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الهاتف</th>
              <th>الحساب</th>
              <th>الطلبات</th>
              <th>المدفوع</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((customer) => (
              <tr key={customer.id}>
                <td><Link href={`/admin/customers/${customer.id}`}>{customer.name}</Link></td>
                <td dir="ltr">{customer.email}</td>
                <td>{customer.phone || "—"}</td>
                <td>{customer.banned ? "موقوف" : "نشط"}</td>
                <td>{customer.orderCount}</td>
                <td>{formatMinor(customer.paidMinor, currency, minorUnit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={pagination.page} pages={pageCount(result.total, pagination.pageSize)} path="/admin/customers" params={q ? { q } : {}} />
    </AdminPage>
  );
}
