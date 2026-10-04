import { asc } from "drizzle-orm";
import { db } from "@/db";
import { deliveryZone } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { Check } from "@/components/controls/check";
import { Stepper } from "@/components/controls/stepper";
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
    <AdminPage title="مناطق التوصيل" description="هذه الرسوم تُستخدم عند إتمام الشراء. لا توجد خريطة أو وعد بمدة توصيل.">
    <div className="admin-split">
      <section className="admin-list">
        <div className="grid gap-2 md:hidden">
          {rows.map((row) => (
            <article key={row.id} className="admin-surface grid gap-2 p-3">
              <a href={`/admin/delivery?id=${row.id}`}>{row.name}</a>
              <p className="admin-note">{minorToInput(row.feeMinor, minorUnit)} · {row.isActive ? "مفعّلة" : "متوقفة"}</p>
              <ConfirmForm action={deleteZoneAction} message={`حذف منطقة «${row.name}»؟ لن تُعرض في الدفع.`}>
                <input type="hidden" name="id" value={row.id} />
                <PendingButton>حذف</PendingButton>
              </ConfirmForm>
            </article>
          ))}
        </div>
        <div className="admin-surface hidden overflow-auto md:block">
          <table className="data-table" style={{ display: "table" }}>
            <thead>
              <tr>
                <th>المنطقة</th>
                <th>الرسوم</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><a href={`/admin/delivery?id=${row.id}`}>{row.name}</a></td>
                  <td>{minorToInput(row.feeMinor, minorUnit)}</td>
                  <td>{row.isActive ? "مفعّلة" : "متوقفة"}</td>
                  <td>
                    <ConfirmForm action={deleteZoneAction} message={`حذف منطقة «${row.name}»؟ لن تُعرض في الدفع.`}>
                      <input type="hidden" name="id" value={row.id} />
                      <PendingButton>حذف</PendingButton>
                    </ConfirmForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          <Stepper name="sortOrder" defaultValue={editing?.sortOrder ?? 0} label="ترتيب العرض" />
        </label>
        <Check name="isActive" defaultChecked={editing?.isActive ?? true}>متاحة</Check>
      </BoundForm>
    </div>
    </AdminPage>
  );
}
