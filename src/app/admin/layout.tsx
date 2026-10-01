import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { isAdminRole } from "@/lib/access";
import { getCurrentUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/admin");
  if (!isAdminRole(user.role)) {
    return <p className="alert">هذه الصفحات للمسؤولة فقط.</p>;
  }
  return (
    <div className="grid gap-6">
      <AdminNav />
      {children}
    </div>
  );
}
