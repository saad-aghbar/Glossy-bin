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
    <div className="grid gap-4">
      <h1 className="text-3xl font-extrabold">إعدادات المتجر</h1>
      <p className="text-sm text-muted">الحقول الفارغة لا تظهر في المتجر. رسوم التوصيل تُحدد من مناطق التوصيل.</p>
      <BoundForm action={saveSettingsAction} submit="حفظ الإعدادات" cancelHref="/admin">
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
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeLogo" value="yes" />
            إزالة الشعار المصوّر
          </label>
        ) : null}
        <label className="grid gap-1">
          العملة
          <input className="field" name="currency" defaultValue={settings?.currency ?? "SAR"} required />
        </label>
        <label className="grid gap-1">
          وحدة العملة الصغرى
          <input className="field" name="minorUnit" defaultValue={settings?.minorUnit ?? 100} required />
        </label>
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
        <label className="grid gap-1">
          تعليمات التحويل
          <textarea className="field" name="bankInstructions" defaultValue={settings?.bankInstructions ?? ""} rows={4} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="codEnabled" defaultChecked={settings?.codEnabled ?? true} />
          الدفع عند الاستلام
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="bankTransferEnabled" defaultChecked={settings?.bankTransferEnabled ?? true} />
          التحويل البنكي
        </label>
      </BoundForm>
    </div>
  );
}