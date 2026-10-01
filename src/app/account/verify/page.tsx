import { authLinkMessage } from "@/lib/form";
import { one } from "@/lib/pagination";

export const metadata = { title: "تأكيد البريد" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = one(params.error);
  return (
    <section className="card mx-auto grid w-full max-w-md gap-4 p-6">
      <h1 className="text-2xl font-extrabold">تأكيد البريد</h1>
      {error ? (
        <p className="alert">{authLinkMessage(error)}</p>
      ) : (
        <p className="ok">تم تأكيد البريد. يمكنك الآن تسجيل الدخول.</p>
      )}
      <a className="underline" href="/account/login">
        تسجيل الدخول
      </a>
    </section>
  );
}
