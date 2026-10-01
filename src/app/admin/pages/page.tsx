import { asc } from "drizzle-orm";
import { db } from "@/db";
import { contentPage } from "@/db/schema";
import { BoundForm } from "@/components/bound-form";
import { savePageAction } from "@/server/actions/admin";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "الصفحات" };

export default async function PagesAdmin() {
  await requireAdminPage();
  const pages = await db.select().from(contentPage).orderBy(asc(contentPage.slug));
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-extrabold">صفحات المتجر</h1>
      <p className="text-sm text-muted">عرض النص للزبائن ليس مراجعة قانونية. النص غير المعتمد لا يظهر كتفاصيل سياسة.</p>
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
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" name="approve" value="yes" defaultChecked={Boolean(page.approvedAt)} />
              <span>اعرضي هذا النص للزبائن</span>
            </label>
          </BoundForm>
        </section>
      ))}
    </div>
  );
}