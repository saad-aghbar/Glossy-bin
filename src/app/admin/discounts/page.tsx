import { desc } from "drizzle-orm";
import { db } from "@/db";
import { discountCode } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { ChoiceList } from "@/components/controls/choice-list";
import { Check } from "@/components/controls/check";
import { Stepper } from "@/components/controls/stepper";
import { CopyCode } from "@/components/admin/copy-code";
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
    <AdminPage title="أكواد الخصم" description="النسبة تُخصم من مجموع المنتجات. المبلغ الثابت يُخصم بالعملة الصغرى المحفوظة. الحد الأدنى يُقارن قبل التوصيل.">
    <div className="admin-split">
      <section className="admin-list">
        {rows.map((row) => (
          <article key={row.id} className={editing?.id === row.id ? "card is-current flex items-center justify-between gap-3 p-3" : "card flex items-center justify-between gap-3 p-3"}>
            <span>
              <CopyCode code={row.code} />
              <a href={`/admin/discounts?id=${row.id}`}>
                {row.type === "percent" ? `${row.value}%` : minorToInput(row.value, minorUnit)} · استخدم {row.usedCount}
                {row.usageLimit ? ` من ${row.usageLimit}` : ""}
              </a>
            </span>
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
          <ChoiceList name="type" defaultValue={editing?.type ?? "percent"} options={[{ value: "percent", label: "نسبة مئوية" }, { value: "fixed", label: "مبلغ ثابت" }]} />
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
          <Stepper name="usageLimit" defaultValue={editing?.usageLimit ?? ""} min={1} label="حد الاستخدام" />
        </label>
        <InstantFields name="startsAt" label="يبدأ" value={editing?.startsAt ?? null} />
        <InstantFields name="endsAt" label="ينتهي" value={editing?.endsAt ?? null} />
        <Check name="isActive" defaultChecked={editing?.isActive ?? true}>نشط</Check>
        <p className="admin-note">
          {editing?.type === "fixed"
            ? `يُخصم ${minorToInput(editing.value, minorUnit)} من مجموع المنتجات إذا بلغ ${minorToInput(editing.minSubtotalMinor, minorUnit)}.`
            : `تُخصم ${editing?.value ?? "…"}٪ من مجموع المنتجات إذا بلغ الحد الأدنى.`}
        </p>
      </BoundForm>
    </div>
    </AdminPage>
  );
}
