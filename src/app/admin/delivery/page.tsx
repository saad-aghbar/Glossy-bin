import { asc } from "drizzle-orm";
import { db } from "@/db";
import { deliveryZone } from "@/db/schema";
import { BoundForm } from "@/components/bound-form";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton } from "@/components/ui";
import { deleteZoneAction, saveZoneAction } from "@/server/actions/admin";
import { minorToInput } from "@/lib/money";
import { one } from "@/lib/pagination";
import { getSettings } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "التوصيل" };

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const [settings, rows] = await Promise.all([
    getSettings(),
    db.select().from(deliveryZone).orderBy(asc(deliveryZone.sortOrder)),
  ]);
  const minorUnit = settings?.minorUnit ?? 100;
  const editing = rows.find((row) => row.id === one(params.id));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="grid gap-2">
        <h1 className="text-3xl font-extrabold">مناطق التوصيل</h1>
        {rows.map((row) => (
          <article key={row.id} className="card flex items-center justify-between gap-3 p-3">
            <a href={`/admin/delivery?id=${row.id}`}>
              {row.name} · {minorToInput(row.feeMinor, minorUnit)}
            </a>
            <ConfirmForm action={deleteZoneAction} message="حذف منطقة التوصيل؟">
              <input type="hidden" name="id" value={row.id} />
              <PendingButton>حذف</PendingButton>
            </ConfirmForm>
          </article>
        ))}
      </section>
      <BoundForm action={saveZoneAction} submit={editing ? "تحديث" : "إضافة"} cancelHref="/admin/delivery">
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <label className="grid gap-1">
          اسم المنطقة
          <input className="field" name="name" defaultValue={editing?.name ?? ""} required />
        </label>
        <label className="grid gap-1">
          الرسوم
          <input className="field" name="fee" defaultValue={editing ? minorToInput(editing.feeMinor, minorUnit) : ""} required />
        </label>
        <label className="grid gap-1">
          ترتيب العرض
          <input className="field" name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
          متاحة
        </label>
      </BoundForm>
    </div>
  );
}
