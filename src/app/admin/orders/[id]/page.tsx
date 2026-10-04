import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/page";
import { Check } from "@/components/controls/check";
import { ChoiceList } from "@/components/controls/choice-list";
import { BoundForm } from "@/components/bound-form";
import { addOrderNoteAction, recordPaymentReceivedAction, updateOrderAction } from "@/server/actions/admin";
import {
  cancelBlockedMessage,
  isOrderStatus,
  orderStatusChoices,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/labels";
import { formatMinor } from "@/lib/money";
import { getAdminOrder, getSettings } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

function when(value: Date) {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [order, settings] = await Promise.all([getAdminOrder(id), getSettings()]);
  if (!order || !settings) notFound();
  const method = order.paymentMethod as PaymentMethod;
  const status = isOrderStatus(order.status) ? order.status : "pending";
  const choices = orderStatusChoices(status, order.paymentStatus);
  const blocked = isOrderStatus(order.status) ? cancelBlockedMessage(order.status, order.paymentStatus) : null;
  const money = (amount: number) => formatMinor(amount, order.currency, settings.minorUnit);
  const canRecord =
    (method === "cod" || method === "bank_transfer") &&
    order.paymentStatus !== "paid" &&
    order.status !== "cancelled";
  const events = [...order.events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const notes = events.filter((event) => event.kind === "note");
  const changes = events.filter((event) => event.kind === "status");
  return (
    <AdminPage
      title={order.number}
      description={
        order.currency === settings.currency
          ? "التوصيل والدفع إجراءان منفصلان. تسجيل الدفع لا ينفّذ استردادًا."
          : `عملة هذا الطلب ${order.currency} وتختلف عن عملة المتجر الحالية ${settings.currency}. المبالغ تبقى كما حُفظت.`
      }
    >
    <article className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
      <section className="admin-surface grid gap-3 p-4">
        <div>
          <h2 className="font-bold">بيانات الزبونة</h2>
          <p>
            {order.recipientName} · {order.phone} · {order.email}
          </p>
        </div>
        <div>
          <h2 className="font-bold">عنوان التوصيل</h2>
          <p>
            {order.city}، {order.area}، {order.street}
          </p>
          <p>منطقة التوصيل: {order.deliveryZoneName}</p>
        </div>
        <div>
          <h2 className="font-bold">ملاحظة الزبونة</h2>
          <p>{order.notes?.trim() ? order.notes : "لا توجد ملاحظة من الزبونة."}</p>
        </div>
        <p>{paymentMethodLabel[method] ?? order.paymentMethod}</p>
        <ul className="grid gap-3">
          {order.items.map((item) => (
            <li key={item.id} className="grid gap-1">
              <span>
                {item.productName} — {item.variantLabel} · {item.sku}
              </span>
              <span className="text-sm text-muted">
                الكمية {item.qty} · سعر القطعة {money(item.unitPriceMinor)} · السطر {money(item.lineTotalMinor)}
              </span>
            </li>
          ))}
        </ul>
        <p>المجموع {money(order.subtotalMinor)}</p>
        <p>
          الخصم {money(order.discountMinor)}
          {order.discountCode ? ` (${order.discountCode})` : ""}
        </p>
        <p>التوصيل {money(order.deliveryFeeMinor)}</p>
        <p className="text-xl font-extrabold">الإجمالي {money(order.totalMinor)}</p>
      </section>
      <div className="grid content-start gap-4">
        <section className="card grid gap-3 p-4">
          <h2 className="font-bold">التوصيل</h2>
          {blocked ? <p className="text-sm text-muted">{blocked}</p> : null}
          <BoundForm action={updateOrderAction} submit="تحديث التوصيل">
            <input type="hidden" name="id" value={order.id} />
            <label className="grid gap-1">
              حالة الطلب
              <ChoiceList name="status" defaultValue={order.status} options={choices.map((value) => ({ value, label: orderStatusLabel[value] }))} />
            </label>
            <p className="text-sm text-muted">الحالية: {orderStatusLabel[status]}</p>
          </BoundForm>
          <h3 className="font-bold">سجل التوصيل</h3>
          {changes.length === 0 ? <p className="text-sm text-muted">لا يوجد سجل بعد.</p> : null}
          <ul className="grid gap-2 text-sm">
            {changes.map((event) => (
              <li key={event.id}>
                من {isOrderStatus(event.fromStatus ?? "") ? orderStatusLabel[event.fromStatus as OrderStatus] : event.fromStatus}
                {" إلى "}
                {isOrderStatus(event.toStatus ?? "") ? orderStatusLabel[event.toStatus as OrderStatus] : event.toStatus}
                {" · "}
                {event.actor?.name ?? "مديرة"}
                {" · "}
                {when(event.createdAt)}
              </li>
            ))}
          </ul>
        </section>
        <section className="card grid gap-3 p-4">
          <h2 className="font-bold">الدفع</h2>
          <p>{paymentStatusLabel[order.paymentStatus as PaymentStatus] ?? order.paymentStatus}</p>
          {order.paidAt ? (
            <p className="text-sm text-muted">
              سُجّل الاستلام في {when(order.paidAt)}
              {order.paidBy?.name ? ` بواسطة ${order.paidBy.name}` : ""}.
            </p>
          ) : (
            <p className="text-sm text-muted">لم يُسجل استلام المبلغ بعد.</p>
          )}
          {canRecord ? (
            <BoundForm action={recordPaymentReceivedAction} submit="تم استلام المبلغ">
              <input type="hidden" name="id" value={order.id} />
              <Check name="confirmPayment" value="yes" required>أؤكد أن المبلغ وصل نقداً أو بالتحويل البنكي</Check>
            </BoundForm>
          ) : (
            <p className="text-sm text-muted">
              {order.paymentStatus === "paid"
                ? "المبلغ مسجّل. هذا ليس استردادًا، والتطبيق لا يعيد المال."
                : order.status === "cancelled"
                  ? "الطلب ملغى، لذلك لا يُسجَّل دفع جديد."
                  : "تسجيل الاستلام متاح للدفع عند الاستلام والتحويل البنكي فقط."}
            </p>
          )}
        </section>
        <section className="card grid gap-3 p-4">
          <h2 className="font-bold">ملاحظات داخلية</h2>
          <p className="text-sm text-muted">لا تظهر للزبونة.</p>
          {notes.length === 0 ? <p className="text-sm text-muted">لا توجد ملاحظات داخلية.</p> : null}
          <ul className="grid gap-2 text-sm">
            {notes.map((event) => (
              <li key={event.id}>
                <span>{event.body}</span>
                <span className="block text-muted">
                  {event.actor?.name ?? "مديرة"} · {when(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
          <BoundForm action={addOrderNoteAction} submit="إضافة ملاحظة">
            <input type="hidden" name="id" value={order.id} />
            <label className="grid gap-1">
              ملاحظة للإدارة فقط
              <textarea className="field" name="body" rows={3} />
            </label>
          </BoundForm>
        </section>
      </div>
    </article>
    </AdminPage>
  );
}
