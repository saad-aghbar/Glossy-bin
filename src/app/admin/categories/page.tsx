import { asc } from "drizzle-orm";
import { db } from "@/db";
import { category } from "@/db/schema";
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
  const rows = await db.select().from(category).orderBy(asc(category.sortOrder));
  const editing = rows.find((row) => row.id === one(params.id));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="grid gap-2">
        <h1 className="text-3xl font-extrabold">التصنيفات</h1>
        {rows.map((row) => (
          <article key={row.id} className="card flex items-center justify-between gap-3 p-3">
            <a href={`/admin/categories?id=${row.id}`}>
              <strong>{row.name}</strong>
              <span className="block text-sm text-muted">{row.isActive ? "ظاهر" : "مخفي"}</span>
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
          <input className="field" name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
          ظاهر
        </label>
      </BoundForm>
    </div>
  );
}
