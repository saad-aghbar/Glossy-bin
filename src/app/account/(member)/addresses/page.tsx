import { BoundForm } from "@/components/bound-form";
import { ConfirmForm } from "@/components/confirm-form";
import { PendingButton } from "@/components/ui";
import { deleteAddressAction, saveAddressAction } from "@/server/actions/account";
import { requireUser } from "@/lib/session";
import { listOwnAddresses } from "@/server/queries";

export const metadata = { title: "العناوين" };

export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await listOwnAddresses(user.id);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="grid gap-3">
        <h1 className="text-2xl font-extrabold">العناوين</h1>
        {addresses.length === 0 ? <p>لا توجد عناوين محفوظة.</p> : null}
        {addresses.map((item) => (
          <article key={item.id} className="card grid gap-2 p-4">
            <p className="font-bold">
              {item.recipientName} {item.isDefault ? "· الافتراضي" : ""}
            </p>
            <p>
              {item.city}، {item.area}، {item.street}
            </p>
            <p>{item.phone}</p>
            <ConfirmForm action={deleteAddressAction} message="حذف هذا العنوان؟">
              <input type="hidden" name="id" value={item.id} />
              <PendingButton>حذف</PendingButton>
            </ConfirmForm>
          </article>
        ))}
      </section>
      <section className="card p-4">
        <h2 className="mb-3 text-xl font-extrabold">عنوان جديد</h2>
        <BoundForm action={saveAddressAction} submit="حفظ العنوان">
          <label className="grid gap-1">
            الاسم
            <input className="field" name="recipientName" autoComplete="name" required />
          </label>
          <label className="grid gap-1">
            الهاتف
            <input className="field" name="phone" autoComplete="tel" required />
          </label>
          <label className="grid gap-1">
            المدينة
            <input className="field" name="city" autoComplete="address-level2" required />
          </label>
          <label className="grid gap-1">
            الحي
            <input className="field" name="area" autoComplete="address-level3" required />
          </label>
          <label className="grid gap-1">
            الشارع
            <input className="field" name="street" autoComplete="street-address" required />
          </label>
          <label className="grid gap-1">
            ملاحظات
            <textarea className="field" name="notes" rows={2} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isDefault" />
            عنوان افتراضي
          </label>
        </BoundForm>
      </section>
    </div>
  );
}
