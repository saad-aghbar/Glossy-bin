import { BoundForm } from "@/components/bound-form";
import { contactAction } from "@/server/actions/admin";
import { getSettings } from "@/server/queries";

export const metadata = { title: "تواصل" };

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-3">
        <h1 className="text-3xl font-extrabold">تواصل معنا</h1>
        <p className="text-muted">للاستفسار عن طلب أو منتج.</p>
        {settings?.whatsappUrl ? (
          <a className="btn btn-ghost w-fit" href={settings.whatsappUrl} target="_blank" rel="noreferrer">
            واتساب
          </a>
        ) : null}
        {settings?.instagramUrl ? (
          <a className="btn btn-ghost w-fit" href={settings.instagramUrl} target="_blank" rel="noreferrer">
            إنستغرام
          </a>
        ) : null}
        {settings?.contactEmail ? <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a> : null}
        {settings?.contactPhone ? <a href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a> : null}
      </div>
      <BoundForm action={contactAction} submit="إرسال">
        <label className="grid gap-1">
          الاسم
          <input className="field" name="name" autoComplete="name" required />
        </label>
        <label className="grid gap-1">
          البريد
          <input className="field" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="grid gap-1">
          الهاتف
          <input className="field" name="phone" autoComplete="tel" />
        </label>
        <label className="grid gap-1">
          الرسالة
          <textarea className="field" name="message" rows={5} required />
        </label>
      </BoundForm>
    </div>
  );
}
