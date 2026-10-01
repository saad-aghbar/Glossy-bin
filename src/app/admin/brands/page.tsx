import { asc } from "drizzle-orm";
import { db } from "@/db";
import { brand } from "@/db/schema";
import { BoundForm } from "@/components/bound-form";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton } from "@/components/ui";
import { deleteBrandAction, saveBrandAction } from "@/server/actions/catalog";
import { one } from "@/lib/pagination";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "العلامات" };

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const rows = await db.select().from(brand).orderBy(asc(brand.sortOrder));
  const editing = rows.find((row) => row.id === one(params.id));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="grid gap-2">
        <h1 className="text-3xl font-extrabold">العلامات</h1>
        {rows.map((row) => (
          <article key={row.id} className="card flex items-center justify-between gap-3 p-3">
            <a href={`/admin/brands?id=${row.id}`}>{row.name}</a>
            <ConfirmForm action={deleteBrandAction} message="حذف هذه العلامة؟">
              <input type="hidden" name="id" value={row.id} />
              <PendingButton>حذف</PendingButton>
            </ConfirmForm>
          </article>
        ))}
      </section>
      <BoundForm action={saveBrandAction} submit={editing ? "تحديث" : "إضافة"} cancelHref="/admin/brands">
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <label className="grid gap-1">
          الاسم
          <input className="field" name="name" defaultValue={editing?.name ?? ""} required />
        </label>
        <label className="grid gap-1">
          ترتيب العرض
          <input className="field" name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
          ظاهرة في التصفية
        </label>
      </BoundForm>
    </div>
  );
}
