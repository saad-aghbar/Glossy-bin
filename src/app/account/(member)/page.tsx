import { BoundForm } from "@/components/bound-form";
import { passwordAction, profileAction } from "@/server/actions/account";
import { requireUser } from "@/lib/session";

export const metadata = { title: "حسابي" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="card grid gap-3 p-4">
        <h1 className="text-2xl font-extrabold">الملف</h1>
        <p className="text-sm text-muted">{user.email}</p>
        <BoundForm action={profileAction} submit="حفظ">
          <label className="grid gap-1">
            الاسم
            <input className="field" name="name" defaultValue={user.name} autoComplete="name" required />
          </label>
          <label className="grid gap-1">
            الهاتف
            <input className="field" name="phone" defaultValue={user.phone ?? ""} autoComplete="tel" />
          </label>
        </BoundForm>
      </section>
      <section className="card grid gap-3 p-4">
        <h2 className="text-2xl font-extrabold">كلمة المرور</h2>
        <BoundForm action={passwordAction} submit="تغيير كلمة المرور">
          <label className="grid gap-1">
            كلمة المرور الحالية
            <input className="field" name="currentPassword" type="password" autoComplete="current-password" required />
          </label>
          <label className="grid gap-1">
            كلمة المرور الجديدة
            <input className="field" name="newPassword" type="password" autoComplete="new-password" required />
          </label>
        </BoundForm>
      </section>
    </div>
  );
}
