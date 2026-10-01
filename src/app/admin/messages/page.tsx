import { Pagination } from "@/components/pagination";
import { pageCount, parsePagination } from "@/lib/pagination";
import { markMessageAction } from "@/server/actions/admin";
import { listMessages } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "الرسائل" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const pagination = parsePagination(params, 20);
  const result = await listMessages(pagination.offset, pagination.pageSize);
  return (
    <div className="grid gap-3">
      <h1 className="text-3xl font-extrabold">الرسائل</h1>
      {result.rows.length === 0 ? <p className="card p-6">لا توجد رسائل بعد</p> : null}
      {result.rows.map((message) => (
        <article key={message.id} className="card grid gap-2 p-4">
          <p className="font-bold">
            {message.name} · {message.email}
          </p>
          <p className="whitespace-pre-wrap">{message.message}</p>
          {message.isRead ? (
            <p className="text-sm text-muted">مقروءة</p>
          ) : (
            <form action={markMessageAction}>
              <input type="hidden" name="id" value={message.id} />
              <button className="btn btn-ghost" type="submit">
                تعليم كمقروءة
              </button>
            </form>
          )}
        </article>
      ))}
      <Pagination page={pagination.page} pages={pageCount(result.total, pagination.pageSize)} path="/admin/messages" params={{}} />
    </div>
  );
}
