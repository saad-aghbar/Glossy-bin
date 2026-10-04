import { asc } from "drizzle-orm";
import { db } from "@/db";
import { offer } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { Check } from "@/components/controls/check";
import { Stepper } from "@/components/controls/stepper";
import { BoundForm } from "@/components/bound-form";
import { InstantFields } from "@/components/date-fields";
import { FileField } from "@/components/file-field";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton } from "@/components/ui";
import { deleteOfferAction, saveOfferAction } from "@/server/actions/admin";
import { one } from "@/lib/pagination";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "العروض" };

function offerState(row: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }) {
  const now = Date.now();
  if (!row.isActive) return "متوقف";
  if (row.startsAt && row.startsAt.getTime() > now) return "مجدول";
  if (row.endsAt && row.endsAt.getTime() < now) return "منتهٍ";
  return "ظاهر الآن";
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const rows = await db.select().from(offer).orderBy(asc(offer.sortOrder));
  const editing = rows.find((row) => row.id === one(params.id));
  return (
    <AdminPage title="العروض" description="يظهر العرض النشط ضمن مدته في الصفحة الرئيسية. الرابط يجب أن يبقى داخل المتجر.">
    <div className="admin-split">
      <section className="admin-list">
        {rows.map((row) => (
          <article key={row.id} className={editing?.id === row.id ? "card is-current flex items-center justify-between gap-3 p-3" : "card flex items-center justify-between gap-3 p-3"}>
            <a href={`/admin/offers?id=${row.id}`}>
              {row.title}
              <span className="block text-sm text-muted">{offerState(row)}</span>
            </a>
            <ConfirmForm action={deleteOfferAction} message="حذف هذا العرض؟">
              <input type="hidden" name="id" value={row.id} />
              <PendingButton>حذف</PendingButton>
            </ConfirmForm>
          </article>
        ))}
      </section>
      <BoundForm action={saveOfferAction} submit={editing ? "تحديث" : "إضافة"} cancelHref="/admin/offers">
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <input type="hidden" name="existingImage" value={editing?.imageUrl ?? ""} />
        <label className="grid gap-1">
          العنوان
          <input className="field" name="title" defaultValue={editing?.title ?? ""} required />
        </label>
        <label className="grid gap-1">
          الوصف
          <textarea className="field" name="description" defaultValue={editing?.description ?? ""} />
        </label>
        <label className="grid gap-1">
          الرابط
          <input className="field" name="linkUrl" defaultValue={editing?.linkUrl ?? ""} placeholder="/products" />
        </label>
        <InstantFields name="startsAt" label="يبدأ" value={editing?.startsAt ?? null} />
        <InstantFields name="endsAt" label="ينتهي" value={editing?.endsAt ?? null} />
        <label className="grid gap-1">
          ترتيب العرض
          <Stepper name="sortOrder" defaultValue={editing?.sortOrder ?? 0} label="ترتيب العرض" />
        </label>
        <div className="grid gap-1">
          الصورة
          <FileField name="image" accept="image/jpeg,image/png,image/webp" />
        </div>
        <Check name="isActive" defaultChecked={editing?.isActive ?? true}>نشط</Check>
        <aside className="admin-surface grid gap-2 p-4">
          <p className="admin-note">معاينة مكان الظهور في الصفحة الرئيسية</p>
          <h3 className="m-0 text-2xl font-medium">{editing?.title || "عنوان العرض"}</h3>
          {editing?.description ? <p className="admin-note">{editing.description}</p> : null}
          <span>شاهدي</span>
        </aside>
      </BoundForm>
    </div>
    </AdminPage>
  );
}
