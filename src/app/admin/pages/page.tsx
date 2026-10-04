import { asc } from "drizzle-orm";
import { db } from "@/db";
import { contentPage } from "@/db/schema";
import { AdminPage } from "@/components/admin/page";
import { Check } from "@/components/controls/check";
import { BoundForm } from "@/components/bound-form";
import { savePageAction } from "@/server/actions/admin";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "الصفحات" };

export default async function PagesAdmin() {
  await requireAdminPage();
  const pages = await db.select().from(contentPage).orderBy(asc(contentPage.slug));
  return (
    <AdminPage title="صفحات المتجر" description="حفظ النص لا يعني نشره. عرض النص للزبائن يحتاج اعتمادًا صريحًا، وهذا ليس مراجعة قانونية." width="narrow">
      {pages.map((page) => (
        <section key={page.id} className="card grid gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">{page.title}</h2>
            <p className="text-sm text-muted">{page.approvedAt ? "معتمد" : "غير معتمد"}</p>
          </div>
          <BoundForm action={savePageAction} submit="حفظ" cancelHref="/admin">
            <input type="hidden" name="slug" value={page.slug} />
            <label className="grid gap-1">
              العنوان
              <input className="field" name="title" defaultValue={page.title} required />
            </label>
            <label className="grid gap-1">
              النص
              <textarea className="field min-h-40" name="body" defaultValue={page.body} required />
            </label>
            <p className="admin-note">الحفظ يحدّث المسودة. الاعتماد أدناه هو ما يُظهر النص للزبائن.</p>
            <aside className="admin-surface p-3 whitespace-pre-wrap">{page.body}</aside>
            <Check name="approve" value="yes" defaultChecked={Boolean(page.approvedAt)}>اعتمدي عرض هذا النص للزبائن</Check>
          </BoundForm>
        </section>
      ))}
    </AdminPage>
  );
}