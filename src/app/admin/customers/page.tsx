import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { one, pageCount, parsePagination } from "@/lib/pagination";
import { listCustomers } from "@/server/queries";
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
  const result = await listCustomers(q, pagination.offset, pagination.pageSize);
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-extrabold">الزبائن</h1>
      <form className="flex gap-2" method="get">
        <input className="field" name="q" defaultValue={q} placeholder="الاسم أو البريد" aria-label="بحث عن زبون" />
        <button className="btn btn-ghost" type="submit">
          بحث
        </button>
      </form>
      {result.rows.map((customer) => (
        <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="card p-3">
          <strong>{customer.name}</strong>
          <span className="block text-sm text-muted">
            {customer.email} {customer.banned ? "· موقوف" : ""}
          </span>
        </Link>
      ))}
      <Pagination page={pagination.page} pages={pageCount(result.total, pagination.pageSize)} path="/admin/customers" params={q ? { q } : {}} />
    </div>
  );
}
