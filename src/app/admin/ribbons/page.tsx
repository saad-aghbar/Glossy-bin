import { asc } from "drizzle-orm";
import { db } from "@/db";
import { homeRibbon } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { Check } from "@/components/controls/check";
import { Stepper } from "@/components/controls/stepper";
import { BoundForm } from "@/components/bound-form";
import { FileField } from "@/components/file-field";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton } from "@/components/ui";
import { deleteRibbonAction, saveRibbonAction } from "@/server/actions/admin";
import { one } from "@/lib/pagination";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "الشريط" };

export default async function RibbonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const rows = await db.select().from(homeRibbon).orderBy(asc(homeRibbon.sortOrder), asc(homeRibbon.createdAt));
  const editing = rows.find((row) => row.id === one(params.id));
  return (
    <AdminPage title="الشريط" description="صور الشريط المائل بين مختارات ووصل حديثاً. الزر في أسفل الصورة يفتح الرابط الذي تحددينه.">
      <div className="admin-split">
        <section className="admin-list">
          {rows.map((row) => (
            <article key={row.id} className={editing?.id === row.id ? "card is-current flex items-center justify-between gap-3 p-3" : "card flex items-center justify-between gap-3 p-3"}>
              <a href={`/admin/ribbons?id=${row.id}`}>
                {row.buttonLabel}
                <span className="block text-sm text-muted">{row.isActive ? "ظاهر" : "متوقف"}</span>
              </a>
              <ConfirmForm action={deleteRibbonAction} message="حذف هذه الصورة من الشريط؟">
                <input type="hidden" name="id" value={row.id} />
                <PendingButton>حذف</PendingButton>
              </ConfirmForm>
            </article>
          ))}
        </section>
        <BoundForm action={saveRibbonAction} submit={editing ? "تحديث" : "إضافة"} cancelHref="/admin/ribbons">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <input type="hidden" name="existingImage" value={editing?.imageUrl ?? ""} />
          <div className="grid gap-1">
            الصورة
            <FileField name="image" accept="image/jpeg,image/png,image/webp" required={!editing} />
          </div>
          <label className="grid gap-1">
            الرابط
            <input className="field" name="linkUrl" defaultValue={editing?.linkUrl ?? ""} placeholder="/products" />
          </label>
          <label className="grid gap-1">
            نص الزر
            <input className="field" name="buttonLabel" defaultValue={editing?.buttonLabel ?? "شاهدي"} maxLength={24} />
          </label>
          <label className="grid gap-1">
            الترتيب
            <Stepper name="sortOrder" defaultValue={editing?.sortOrder ?? rows.length} label="الترتيب" />
          </label>
          <Check name="isActive" defaultChecked={editing?.isActive ?? true}>ظاهر في الصفحة الرئيسية</Check>
        </BoundForm>
      </div>
    </AdminPage>
  );
}
