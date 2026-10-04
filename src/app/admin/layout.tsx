import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/shell";
import { isAdminRole } from "@/lib/access";
import { getCurrentUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/admin");
  if (!isAdminRole(user.role)) {
    return (
      <div className="admin-denied">
        <p className="alert">هذه الصفحات للمسؤولة فقط.</p>
      </div>
    );
  }
  return <AdminShell name={user.name}>{children}</AdminShell>;
}
