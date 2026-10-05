import Link from "next/link";
import { BoundForm } from "@/components/bound-form";
import { registerAction } from "@/server/actions/account";

export const metadata = { title: "حساب جديد" };

export default function RegisterPage() {
  return (
    <section className="card shop-column grid gap-4 p-6">
      <h1 className="text-2xl font-extrabold">إنشاء حساب</h1>
      <BoundForm action={registerAction} submit="تسجيل">
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
          كلمة المرور
          <input className="field" name="password" type="password" autoComplete="new-password" required />
        </label>
      </BoundForm>
      <Link href="/account/login">لديك حساب؟ ادخلي</Link>
    </section>
  );
}
