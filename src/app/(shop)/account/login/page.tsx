import Link from "next/link";
import { BoundForm } from "@/components/bound-form";
import { loginAction } from "@/server/actions/account";
import { one } from "@/lib/pagination";
import { safeNextPath } from "@/lib/access";

export const metadata = { title: "دخول" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNextPath(one(params.next));
  return (
    <section className="card shop-column grid gap-4 p-6">
      <h1 className="text-2xl font-extrabold">تسجيل الدخول</h1>
      <BoundForm action={loginAction} submit="دخول">
        <input type="hidden" name="next" value={next} />
        <label className="grid gap-1">
          البريد
          <input className="field" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="grid gap-1">
          كلمة المرور
          <input className="field" name="password" type="password" autoComplete="current-password" required />
        </label>
      </BoundForm>
      <Link href="/account/forgot">نسيت كلمة المرور</Link>
      <Link href="/account/register">إنشاء حساب</Link>
    </section>
  );
}
