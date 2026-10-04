import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackingPurchase } from "@/components/tracking";
import { isAdminRole } from "@/lib/access";
import { visibleBankInstructions } from "@/lib/links";
import { formatMinor } from "@/lib/money";
import { configuredPixelId } from "@/lib/tracking";
import { getCurrentUser } from "@/lib/session";
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/lib/labels";
import { getOrderByToken, getSettings } from "@/server/queries";

export const metadata = { title: "تأكيد الطلب" };

export default async function ConfirmationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [order, settings, user] = await Promise.all([getOrderByToken(token), getSettings(), getCurrentUser()]);
  if (!order || !settings) notFound();
  return (
    <article className="card grid gap-4 p-6">
      <h1 className="text-3xl font-extrabold">تم استلام الطلب</h1>
      <p>
        رقم الطلب <strong>{order.number}</strong>
      </p>
      <p>حالة التوصيل: {orderStatusLabel[order.status as OrderStatus] ?? order.status}</p>
      <p>طريقة الدفع: {paymentMethodLabel[order.paymentMethod as PaymentMethod] ?? order.paymentMethod}</p>
      <p>حالة الدفع: {paymentStatusLabel[order.paymentStatus as PaymentStatus] ?? order.paymentStatus}</p>
      <p>المجموع {formatMinor(order.subtotalMinor, settings.currency, settings.minorUnit)}</p>
      <p>الخصم {formatMinor(order.discountMinor, settings.currency, settings.minorUnit)}</p>
      <p>التوصيل {formatMinor(order.deliveryFeeMinor, settings.currency, settings.minorUnit)}</p>
      <p className="text-xl font-extrabold">الإجمالي {formatMinor(order.totalMinor, settings.currency, settings.minorUnit)}</p>
      <p>
        التوصيل إلى {order.recipientName}، {order.city}، {order.area}، {order.street}
      </p>
      {visibleBankInstructions(order.paymentMethod, settings.bankInstructions) ? (
        <p className="whitespace-pre-wrap rounded-2xl bg-accent-soft p-4">
          {visibleBankInstructions(order.paymentMethod, settings.bankInstructions)}
        </p>
      ) : null}
      <TrackingPurchase
        pixelId={configuredPixelId(process.env.META_PIXEL_ID)}
        isAdmin={isAdminRole(user?.role)}
        currency={settings.currency}
        totalMinor={order.totalMinor}
        minorUnit={settings.minorUnit}
        eventId={order.publicToken}
      />
      <ul className="grid gap-2">
        {order.items.map((item) => (
          <li key={item.id} className="break-words">
            {item.productName} — {item.variantLabel} × {item.qty}
          </li>
        ))}
      </ul>
      <Link className="btn btn-primary w-fit" href="/account/orders">
        طلباتي
      </Link>
    </article>
  );
}
