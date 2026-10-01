import { BoundForm } from "@/components/bound-form";
import { authLinkMessage } from "@/lib/form";
import { one } from "@/lib/pagination";
import { resetAction } from "@/server/actions/account";

export const metadata = { title: "كلمة مرور جديدة" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = one(params.token);
  const error = one(params.error);
  return (
    <section className="card mx-auto grid w-full max-w-md gap-4 p-6">
      <h1 className="text-2xl font-extrabold">كلمة مرور جديدة</h1>
      {error ? <p className="alert">{authLinkMessage(error)}</p> : null}
      <BoundForm action={resetAction} submit="حفظ كلمة المرور">
        <input type="hidden" name="token" value={token} />
        <label className="grid gap-1">
          كلمة المرور الجديدة
          <input className="field" name="password" type="password" autoComplete="new-password" required />
        </label>
      </BoundForm>
    </section>
  );
}
