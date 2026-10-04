import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { brand, product } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { Check } from "@/components/controls/check";
import { Stepper } from "@/components/controls/stepper";
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
  const [rows, counts] = await Promise.all([
    db.select().from(brand).orderBy(asc(brand.sortOrder)),
    db.select({ id: product.brandId, count: sql<number>`count(*)::int` }).from(product).groupBy(product.brandId),
  ]);
  const editing = rows.find((row) => row.id === one(params.id));
  return (
    <AdminPage title="العلامات" description="اسم العلامة وترتيب ظهورها. لا توجد صور علامات في البيانات، لذلك تُعرض بالحرف الأول.">
    <div className="admin-split">
      <section className="admin-list">
        {rows.map((row) => (
          <article key={row.id} className={editing?.id === row.id ? "card is-current flex items-center justify-between gap-3 p-3" : "card flex items-center justify-between gap-3 p-3"}>
            <a href={`/admin/brands?id=${row.id}`}><strong>{row.name.slice(0, 1)}</strong> {row.name} · {counts.find((item) => item.id === row.id)?.count ?? 0} منتج</a>
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
          <Stepper name="sortOrder" defaultValue={editing?.sortOrder ?? 0} label="ترتيب العرض" />
        </label>
        <Check name="isActive" defaultChecked={editing?.isActive ?? true}>ظاهرة في التصفية</Check>
      </BoundForm>
    </div>
    </AdminPage>
  );
}
