import { redirect } from "next/navigation";
import { NavLink } from "@/components/nav-link";
import { PendingButton } from "@/components/ui";
import { logoutAction } from "@/server/actions/account";
import { getCurrentUser } from "@/lib/session";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/account");
  if (user.banned) {
    return <p className="alert">تم إيقاف هذا الحساب. تواصلي مع المتجر إذا كان ذلك بالخطأ.</p>;
  }
  return (
    <div className="grid gap-6">
      <div className="account-nav">
        <nav className="flex flex-wrap gap-3" aria-label="الحساب">
          <NavLink href="/account" exact>
            الملف
          </NavLink>
          <NavLink href="/account/addresses">العناوين</NavLink>
          <NavLink href="/account/orders">الطلبات</NavLink>
        </nav>
        <form action={logoutAction}>
          <PendingButton>خروج</PendingButton>
        </form>
      </div>
      {children}
    </div>
  );
}
