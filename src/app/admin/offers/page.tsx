import { asc } from "drizzle-orm";
import { db } from "@/db";
import { offer } from "@/db/schema";
import { BoundForm } from "@/components/bound-form";
import { InstantFields } from "@/components/date-fields";
import { FileField } from "@/components/file-field";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton } from "@/components/ui";
import { deleteOfferAction, saveOfferAction } from "@/server/actions/admin";
import { one } from "@/lib/pagination";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "العروض" };

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
    <div className="grid gap-6 md:grid-cols-2">
      <section className="grid gap-2">
        <h1 className="text-3xl font-extrabold">العروض</h1>
        {rows.map((row) => (
          <article key={row.id} className="card flex items-center justify-between gap-3 p-3">
            <a href={`/admin/offers?id=${row.id}`}>{row.title}</a>
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
          <input className="field" name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} />
        </label>
        <div className="grid gap-1">
          الصورة
          <FileField name="image" accept="image/jpeg,image/png,image/webp" />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
          نشط
        </label>
      </BoundForm>
    </div>
  );
}
