import { BoundForm } from "@/components/bound-form";
import { forgotAction } from "@/server/actions/account";

export const metadata = { title: "استعادة كلمة المرور" };

export default function ForgotPage() {
  return (
    <section className="card shop-column grid gap-4 p-6">
      <h1 className="text-2xl font-extrabold">استعادة كلمة المرور</h1>
      <BoundForm action={forgotAction} submit="إرسال الرابط">
        <label className="grid gap-1">
          البريد
          <input className="field" name="email" type="email" autoComplete="email" required />
        </label>
      </BoundForm>
    </section>
  );
}
