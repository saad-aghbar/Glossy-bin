import Link from "next/link";
import { AdminPage } from "@/components/admin/page";
import { Check } from "@/components/controls/check";
import { BoundForm } from "@/components/bound-form";
import { FileField } from "@/components/file-field";
import { saveSettingsAction } from "@/server/actions/admin";
import { getSettings } from "@/server/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "إعدادات المتجر" };

export default async function SettingsPage() {
  await requireAdminPage();
  const settings = await getSettings();
  return (
    <AdminPage title="إعدادات المتجر" description="الحقول الفارغة لا تظهر في المتجر. الشعار النصي الفارغ يبقى فارغًا. رسوم التوصيل من مناطق التوصيل وليست هنا." width="narrow">
      <nav className="flex flex-wrap gap-3 text-sm" aria-label="أقسام الإعدادات">
        <a href="#identity">الهوية</a>
        <a href="#contact">التواصل</a>
        <a href="#payment">الدفع</a>
        <Link href="/admin/delivery">مناطق التوصيل</Link>
      </nav>
      <BoundForm action={saveSettingsAction} submit="حفظ الإعدادات" cancelHref="/admin">
        <h2 id="identity" className="m-0 text-lg font-medium">الهوية</h2>
        <label className="grid gap-1">
          اسم المتجر
          <input className="field" name="storeName" defaultValue={settings?.storeName ?? ""} required />
        </label>
        <label className="grid gap-1">
          الشعار النصي
          <input className="field" name="tagline" defaultValue={settings?.tagline ?? ""} placeholder="يظهر في الصفحة الرئيسية والتذييل" />
        </label>
        <div className="grid gap-1">
          الشعار المصوّر
          <FileField name="logo" accept="image/jpeg,image/png,image/webp" />
        </div>
        {settings?.logoUrl ? (
          <div className="grid gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.logoUrl} alt="" className="h-16 w-auto object-contain" />
            <Check name="removeLogo" value="yes">إزالة الشعار المصوّر</Check>
          </div>
        ) : null}
        <label className="grid gap-1">
          العملة
          <input className="field" name="currency" defaultValue={settings?.currency ?? "SAR"} required />
        </label>
        <label className="grid gap-1">
          وحدة العملة الصغرى
          <input className="field" name="minorUnit" defaultValue={settings?.minorUnit ?? 100} required />
        </label>
        <h2 id="contact" className="m-0 text-lg font-medium">التواصل</h2>
        <label className="grid gap-1">
          واتساب
          <input className="field" name="whatsappUrl" defaultValue={settings?.whatsappUrl ?? ""} placeholder="https://wa.me/..." />
        </label>
        <label className="grid gap-1">
          إنستغرام
          <input className="field" name="instagramUrl" defaultValue={settings?.instagramUrl ?? ""} placeholder="https://instagram.com/..." />
        </label>
        <label className="grid gap-1">
          بريد يظهر للزبائن
          <input className="field" name="contactEmail" type="email" defaultValue={settings?.contactEmail ?? ""} />
        </label>
        <label className="grid gap-1">
          هاتف يظهر للزبائن
          <input className="field" name="contactPhone" defaultValue={settings?.contactPhone ?? ""} />
        </label>
        <label className="grid gap-1">
          بريد داخلي لإشعارات الطلبات
          <input className="field" name="orderNotifyEmail" type="email" defaultValue={settings?.orderNotifyEmail ?? ""} />
          <span className="text-sm text-muted">لا يظهر في المتجر.</span>
        </label>
        <h2 id="payment" className="m-0 text-lg font-medium">الدفع</h2>
        <p className="admin-note">العملة المعروضة هنا هي رمز المتجر المحفوظ ({settings?.currency ?? "SAR"}). مبالغ الطلبات القديمة تبقى بعملة كل طلب ولا تُحوَّل.</p>
        <label className="grid gap-1">
          تعليمات التحويل
          <textarea className="field" name="bankInstructions" defaultValue={settings?.bankInstructions ?? ""} rows={4} />
        </label>
        <Check name="codEnabled" defaultChecked={settings?.codEnabled ?? true}>الدفع عند الاستلام</Check>
        <Check name="bankTransferEnabled" defaultChecked={settings?.bankTransferEnabled ?? true}>التحويل البنكي</Check>
      </BoundForm>
    </AdminPage>
  );
}