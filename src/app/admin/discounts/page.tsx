import { desc } from "drizzle-orm";
import { db } from "@/db";
import { discountCode } from "@/db/schema";
import { BoundForm } from "@/components/bound-form";
import { InstantFields } from "@/components/date-fields";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton } from "@/components/ui";
import { deleteDiscountAction, saveDiscountAction } from "@/server/actions/admin";
import { minorToInput } from "@/lib/money";
import { one } from "@/lib/pagination";
import { getSettings } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "أكواد الخصم" };

export default async function DiscountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const [settings, rows] = await Promise.all([
    getSettings(),
    db.select().from(discountCode).orderBy(desc(discountCode.createdAt)),
  ]);
  const minorUnit = settings?.minorUnit ?? 100;
  const editing = rows.find((row) => row.id === one(params.id));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="grid gap-2">
        <h1 className="text-3xl font-extrabold">أكواد الخصم</h1>
        {rows.map((row) => (
          <article key={row.id} className="card flex items-center justify-between gap-3 p-3">
            <a href={`/admin/discounts?id=${row.id}`}>
              {row.code} · {row.type === "percent" ? `${row.value}%` : minorToInput(row.value, minorUnit)} · {row.usedCount}
              {row.usageLimit ? `/${row.usageLimit}` : ""}
            </a>
            <ConfirmForm action={deleteDiscountAction} message="حذف رمز الخصم؟">
              <input type="hidden" name="id" value={row.id} />
              <PendingButton>حذف</PendingButton>
            </ConfirmForm>
          </article>
        ))}
      </section>
      <BoundForm action={saveDiscountAction} submit={editing ? "تحديث" : "إضافة"} cancelHref="/admin/discounts">
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <label className="grid gap-1">
          الرمز
          <input className="field" name="code" defaultValue={editing?.code ?? ""} required />
        </label>
        <label className="grid gap-1">
          النوع
          <select className="select" name="type" defaultValue={editing?.type ?? "percent"}>
            <option value="percent">نسبة مئوية</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
        </label>
        <label className="grid gap-1">
          القيمة
          <input
            className="field"
            name="value"
            defaultValue={editing ? (editing.type === "percent" ? String(editing.value) : minorToInput(editing.value, minorUnit)) : ""}
            required
          />
        </label>
        <label className="grid gap-1">
          الحد الأدنى
          <input className="field" name="minSubtotal" defaultValue={editing ? minorToInput(editing.minSubtotalMinor, minorUnit) : "0"} />
        </label>
        <label className="grid gap-1">
          حد الاستخدام
          <input className="field" name="usageLimit" defaultValue={editing?.usageLimit ?? ""} />
        </label>
        <InstantFields name="startsAt" label="يبدأ" value={editing?.startsAt ?? null} />
        <InstantFields name="endsAt" label="ينتهي" value={editing?.endsAt ?? null} />
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
          نشط
        </label>
      </BoundForm>
    </div>
  );
}
