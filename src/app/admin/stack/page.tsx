import { asc } from "drizzle-orm";
import { db } from "@/db";
import { heroStackImage } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { Check } from "@/components/controls/check";
import { Stepper } from "@/components/controls/stepper";
import { BoundForm } from "@/components/bound-form";
import { FileField } from "@/components/file-field";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton } from "@/components/ui";
import { deleteHeroStackAction, saveHeroStackAction } from "@/server/actions/admin";
import { one } from "@/lib/pagination";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "المكدس" };

export default async function HeroStackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const rows = await db.select().from(heroStackImage).orderBy(asc(heroStackImage.sortOrder), asc(heroStackImage.createdAt));
  const editing = rows.find((row) => row.id === one(params.id));
  return (
    <AdminPage title="المكدس" description="صور المقدمة الثابتة. تظهر في المكدس بالترتيب الذي تحددينه، من الأمام إلى الخلف.">
      <div className="admin-split">
        <section className="admin-list">
          {rows.map((row, index) => (
            <article key={row.id} className={editing?.id === row.id ? "card is-current flex items-center justify-between gap-3 p-3" : "card flex items-center justify-between gap-3 p-3"}>
              <a className="flex items-center gap-3" href={`/admin/stack?id=${row.id}`}>
                {/* Admin preview of an uploaded stack photo. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.imageUrl} alt="" width={48} height={64} />
                <span>
                  صورة {index + 1}
                  <span className="block text-sm text-muted">{row.isActive ? "ظاهرة" : "متوقفة"}</span>
                </span>
              </a>
              <ConfirmForm action={deleteHeroStackAction} message="حذف هذه الصورة من المكدس؟">
                <input type="hidden" name="id" value={row.id} />
                <PendingButton>حذف</PendingButton>
              </ConfirmForm>
            </article>
          ))}
        </section>
        <BoundForm action={saveHeroStackAction} submit={editing ? "تحديث" : "إضافة"} cancelHref="/admin/stack">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <input type="hidden" name="existingImage" value={editing?.imageUrl ?? ""} />
          <div className="grid gap-1">
            الصورة
            <FileField name="image" accept="image/jpeg,image/png,image/webp" required={!editing} />
          </div>
          <label className="grid gap-1">
            الترتيب
            <Stepper name="sortOrder" defaultValue={editing?.sortOrder ?? rows.length} label="الترتيب" />
          </label>
          <Check name="isActive" defaultChecked={editing?.isActive ?? true}>ظاهرة في المقدمة</Check>
        </BoundForm>
      </div>
    </AdminPage>
  );
}
