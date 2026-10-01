"use client";

import { useActionState, useState } from "react";
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
  const fields = state?.fields ?? {};
  return (
    <form ref={formRef} action={action} className="grid gap-3">
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
            <label key={item.id} className="flex items-start gap-2">
              <input type="radio" name="addressId" value={item.id} defaultChecked={item.isDefault} />
              <span>
                {item.recipientName} — {item.city}، {item.area}، {item.street}
              </span>
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input type="radio" name="addressId" value="" defaultChecked={addresses.every((item) => !item.isDefault)} />
            عنوان جديد
          </label>
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
      {user ? (
        <label className="flex items-center gap-2">
          <input type="checkbox" name="saveAddress" />
          حفظ هذا العنوان في حسابي
        </label>
      ) : null}
      <fieldset className="grid gap-2">
        <legend className="font-bold">طريقة الدفع</legend>
        {codEnabled ? (
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={method === "cod"}
              onChange={() => setMethod("cod")}
            />
            {paymentMethodLabel.cod}
          </label>
        ) : null}
        {bankTransferEnabled ? (
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentMethod"
              value="bank_transfer"
              checked={method === "bank_transfer"}
              onChange={() => setMethod("bank_transfer")}
            />
            {paymentMethodLabel.bank_transfer}
          </label>
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
