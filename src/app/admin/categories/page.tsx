import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { category, product } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { Check } from "@/components/controls/check";
import { Stepper } from "@/components/controls/stepper";
import { BoundForm } from "@/components/bound-form";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton } from "@/components/ui";
import { deleteCategoryAction, saveCategoryAction } from "@/server/actions/catalog";
import { one } from "@/lib/pagination";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "التصنيفات" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const [rows, counts] = await Promise.all([
    db.select().from(category).orderBy(asc(category.sortOrder)),
    db.select({ id: product.categoryId, count: sql<number>`count(*)::int` }).from(product).groupBy(product.categoryId),
  ]);
  const editing = rows.find((row) => row.id === one(params.id));
  return (
    <AdminPage title="التصنيفات" description="قائمة مسطّحة. لا توجد تصنيفات فرعية في البيانات.">
      <div className="admin-split">
      <section className="admin-list">
        {rows.map((row) => (
          <article key={row.id} className={editing?.id === row.id ? "card is-current flex items-center justify-between gap-3 p-3" : "card flex items-center justify-between gap-3 p-3"}>
            <a href={`/admin/categories?id=${row.id}`}>
              <strong>{row.name}</strong>
              <span className="block text-sm text-muted">{row.isActive ? "ظاهر" : "مخفي"} · {counts.find((item) => item.id === row.id)?.count ?? 0} منتج · ترتيب {row.sortOrder}</span>
            </a>
            <ConfirmForm action={deleteCategoryAction} message="حذف هذا التصنيف؟">
              <input type="hidden" name="id" value={row.id} />
              <PendingButton>حذف</PendingButton>
            </ConfirmForm>
          </article>
        ))}
      </section>
      <BoundForm action={saveCategoryAction} submit={editing ? "تحديث" : "إضافة"} cancelHref="/admin/categories">
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <label className="grid gap-1">
          الاسم
          <input className="field" name="name" defaultValue={editing?.name ?? ""} required />
        </label>
        <label className="grid gap-1">
          الوصف
          <textarea className="field" name="description" defaultValue={editing?.description ?? ""} />
        </label>
        <label className="grid gap-1">
          ترتيب العرض
          <Stepper name="sortOrder" defaultValue={editing?.sortOrder ?? 0} label="ترتيب العرض" />
        </label>
        <Check name="isActive" defaultChecked={editing?.isActive ?? true}>ظاهر</Check>
      </BoundForm>
      </div>
    </AdminPage>
  );
}
