import { AdminPage } from "@/components/admin/page";
import { Pagination } from "@/components/pagination";
import { one, pageCount, parsePagination } from "@/lib/pagination";
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
  const selected = result.rows.find((message) => message.id === one(params.id)) ?? result.rows[0];
  return (
    <AdminPage title="الرسائل" description="رسائل نموذج التواصل. لا يوجد إرسال رد من لوحة الإدارة.">
      {result.rows.length === 0 ? <p className="admin-surface p-4">لا توجد رسائل بعد</p> : null}
      {result.rows.length > 0 && selected ? (
        <div className="admin-inbox">
          <div className="admin-surface grid">
            {result.rows.map((message) => (
              <a key={message.id} href={`/admin/messages?id=${message.id}`} className="grid gap-1 border-b border-[var(--admin-line)] p-3">
                <strong>{message.name}</strong>
                <span className="admin-note">{message.isRead ? "مقروءة" : "جديدة"} · {message.createdAt.toLocaleDateString("ar")}</span>
                <span>{message.message.slice(0, 80)}</span>
              </a>
            ))}
          </div>
          <article className="admin-surface grid gap-3 p-4">
            <p className="font-medium">{selected.name}</p>
            <p className="admin-note" dir="ltr">{selected.email}</p>
            <p className="whitespace-pre-wrap">{selected.message}</p>
            {selected.isRead ? (
              <p className="admin-note">مقروءة</p>
            ) : (
              <form action={markMessageAction}>
                <input type="hidden" name="id" value={selected.id} />
                <button className="btn btn-ghost" type="submit">تعليم كمقروءة</button>
              </form>
            )}
          </article>
        </div>
      ) : null}
      <Pagination page={pagination.page} pages={pageCount(result.total, pagination.pageSize)} path="/admin/messages" params={{}} />
    </AdminPage>
  );
}
