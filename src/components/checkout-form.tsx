"use client";

import { useActionState, useState } from "react";
import { Check, Radio } from "@/components/controls/check";
import { useKeepEnteredValues } from "@/components/keep-values";
import { visibleBankInstructions } from "@/lib/links";
import { checkoutAction } from "@/server/actions/checkout";
import type { ActionState } from "@/lib/form";
import { paymentMethodLabel, type PaymentMethod } from "@/lib/labels";

type Address = {
  id: string;
  recipientName: string;
  phone: string;
  city: string;
  area: string;
  street: string;
  isDefault: boolean;
};

export function CheckoutForm({
  user,
  addresses,
  codEnabled,
  bankTransferEnabled,
  bankInstructions,
  zoneId,
  discountCode,
  checkoutKey,
  blocked,
}: {
  user: { name: string; email: string; phone: string | null } | null;
  addresses: Address[];
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  bankInstructions: string | null;
  zoneId: string;
  discountCode: string;
  checkoutKey: string;
  blocked: boolean;
}) {
  const [state, action, pending] = useActionState(checkoutAction, null as ActionState);
  const formRef = useKeepEnteredValues(state);
  const [method, setMethod] = useState<PaymentMethod>(codEnabled ? "cod" : "bank_transfer");
  const [addressId, setAddressId] = useState(addresses.find((item) => item.isDefault)?.id ?? "");
  const fields = state?.fields ?? {};
  return (
    <form ref={formRef} action={action} className="card grid gap-3 p-4">
      {state?.error ? (
        <p className="alert" role="alert">
          {state.error}
        </p>
      ) : null}
      <input type="hidden" name="idempotencyKey" value={checkoutKey} />
      <input type="hidden" name="deliveryZoneId" value={zoneId} />
      <input type="hidden" name="discountCode" value={discountCode} />
      {addresses.length > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="font-bold">عنوان محفوظ</legend>
          {addresses.map((item) => (
            <Radio key={item.id} name="addressId" value={item.id} checked={addressId === item.id} onChecked={() => setAddressId(item.id)}>
              {item.recipientName} — {item.city}، {item.area}، {item.street}
            </Radio>
          ))}
          <Radio name="addressId" value="" checked={addressId === ""} onChecked={() => setAddressId("")}>
            عنوان جديد
          </Radio>
        </fieldset>
      ) : null}
      <Field label="الاسم" name="recipientName" defaultValue={user?.name ?? ""} error={fields.recipientName} />
      <Field label="الهاتف" name="phone" defaultValue={user?.phone ?? ""} error={fields.phone} />
      <Field label="البريد" name="email" type="email" defaultValue={user?.email ?? ""} error={fields.email} />
      <Field label="المدينة" name="city" error={fields.city} />
      <Field label="الحي" name="area" error={fields.area} />
      <Field label="الشارع" name="street" error={fields.street} />
      <label className="grid gap-1">
        ملاحظات
        <textarea className="field" name="notes" rows={3} />
      </label>
      {user ? <Check name="saveAddress">حفظ هذا العنوان في حسابي</Check> : null}
      <fieldset className="grid gap-2">
        <legend className="font-bold">طريقة الدفع</legend>
        {codEnabled ? (
          <Radio name="paymentMethod" value="cod" checked={method === "cod"} onChecked={() => setMethod("cod")}>
            {paymentMethodLabel.cod}
          </Radio>
        ) : null}
        {bankTransferEnabled ? (
          <Radio name="paymentMethod" value="bank_transfer" checked={method === "bank_transfer"} onChecked={() => setMethod("bank_transfer")}>
            {paymentMethodLabel.bank_transfer}
          </Radio>
        ) : null}
        {visibleBankInstructions(method, bankInstructions) ? (
          <p className="whitespace-pre-wrap text-sm">{visibleBankInstructions(method, bankInstructions)}</p>
        ) : null}
      </fieldset>
      <p className="text-sm text-muted">طريقة الدفع المختارة: {paymentMethodLabel[method]}</p>
      <div className="grid gap-2">
        {blocked ? <p className="alert">لا يمكن تأكيد الطلب قبل حذف القطع غير المتاحة من الحقيبة.</p> : null}
        <button className="btn btn-primary w-fit" type="submit" disabled={pending || blocked}>
          {pending ? "لحظة..." : "تأكيد الطلب"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  error,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1">
      {label}
      <input className="field" name={name} type={type} defaultValue={defaultValue} />
      {error ? (
        <span className="alert" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
