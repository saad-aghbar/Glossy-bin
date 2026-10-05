import { notFound } from "next/navigation";
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/lib/labels";
import { formatMinor } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getOwnOrder, getSettings } from "@/server/queries";

export default async function OwnOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await requireUser();
  const { number } = await params;
  const [order, settings] = await Promise.all([getOwnOrder(user.id, number), getSettings()]);
  if (!order || !settings) notFound();
  const money = (amount: number) => formatMinor(amount, settings.currency, settings.minorUnit);
  return (
    <article className="card shop-column grid gap-4 p-5">
      <h1 className="text-2xl font-extrabold">{order.number}</h1>
      <dl className="grid gap-2">
        <div className="flex justify-between gap-3">
          <dt>حالة التوصيل</dt>
          <dd>{orderStatusLabel[order.status as OrderStatus]}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>طريقة الدفع</dt>
          <dd>{paymentMethodLabel[order.paymentMethod as PaymentMethod]}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>حالة الدفع</dt>
          <dd>{paymentStatusLabel[order.paymentStatus as PaymentStatus]}</dd>
        </div>
      </dl>
      <p>
        {order.city}، {order.area}، {order.street}
      </p>
      <h2 className="text-lg font-bold">المنتجات</h2>
      <ul className="grid gap-2">
        {order.items.map((item) => (
          <li key={item.id} className="flex min-w-0 justify-between gap-3">
            <span className="min-w-0 break-words">
              {item.productName} — {item.variantLabel} × {item.qty}
            </span>
            <span className="shrink-0">{money(item.lineTotalMinor)}</span>
          </li>
        ))}
      </ul>
      <dl className="grid gap-1 border-t border-line pt-3">
        <div className="flex justify-between gap-3">
          <dt>المجموع</dt>
          <dd>{money(order.subtotalMinor)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>الخصم</dt>
          <dd>{money(order.discountMinor)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>التوصيل</dt>
          <dd>{money(order.deliveryFeeMinor)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-xl font-extrabold">
          <dt>الإجمالي</dt>
          <dd>{money(order.totalMinor)}</dd>
        </div>
      </dl>
    </article>
  );
}
